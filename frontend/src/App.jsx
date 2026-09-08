import { useState, useEffect } from 'react';

function App() {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // RAG States
  const [query, setQuery] = useState('');
  const [ragResponse, setRagResponse] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch paginated items and total count
  const fetchData = async () => {
    try {
      const [itemsRes, countRes] = await Promise.all([
        fetch('http://localhost:8000/items?skip=0&limit=50'),
        fetch('http://localhost:8000/items/count')
      ]);
      const itemsData = await itemsRes.json();
      const countData = await countRes.json();
      setItems(itemsData);
      setTotalCount(countData.total);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Add Item
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await fetch('http://localhost:8000/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        setTitle('');
        setDescription('');
        fetchData();
      }
    } catch (err) {
      console.error('Error adding item:', err);
    }
  };

  // Delete Item
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/items/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  // Toggle Item Complete
  const handleToggle = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/items/${id}`, { method: 'PUT' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  // Submit Question to RAG Assistant
  const handleAskRag = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setRagResponse(null);

    try {
      const res = await fetch(`http://localhost:8000/items/ask-rag?query=${encodeURIComponent(query)}`, {
        method: 'POST'
      });
      const data = await res.json();
      setRagResponse(data);
    } catch (err) {
      console.error('RAG query error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', fontFamily: 'Arial, sans-serif', padding: '0 20px' }}>
      
      {/* --- RAG AI Section --- */}
      <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
        <h2 style={{ textAlign: 'center', color: '#4338ca', marginTop: 0 }}>Ask AI Assistant (RAG)</h2>
        <form onSubmit={handleAskRag} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. tell me total number of id"
            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '12px 24px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            {loading ? 'Thinking...' : 'Ask AI'}
          </button>
        </form>

        {ragResponse && (
          <div style={{ marginTop: '20px', padding: '16px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>AI Answer:</h4>
            <p style={{ margin: '0 0 12px 0', lineHeight: 1.5, color: '#334155' }}>{ragResponse.answer}</p>
            {ragResponse.retrieved_context?.length > 0 && (
              <small style={{ color: '#64748b' }}>
                <strong>Sources used from DB:</strong> {ragResponse.retrieved_context.map(c => `#${c.id} - ${c.title}`).join(', ')}
              </small>
            )}
          </div>
        )}
      </div>

      {/* --- Item Form & List Section --- */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ textAlign: 'center', color: '#0f172a' }}>3-Tier Item Manager</h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px' }}>Total Records in DB: <strong>{totalCount}</strong></p>

        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <button
            type="submit"
            style={{ padding: '10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Add Item
          </button>
        </form>

        <div>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer'
              }}
            >
              <div onClick={() => handleToggle(item.id)} style={{ flex: 1 }}>
                <span style={{ textDecoration: item.completed ? 'line-through' : 'none', fontWeight: 600, color: item.completed ? '#94a3b8' : '#0f172a' }}>
                  #{item.id} - {item.title}
                </span>
                {item.description && <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>{item.description}</p>}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export default App;