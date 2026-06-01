fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(() => {
    document.getElementById('status').textContent = '✅ TaxMate server is running';
    document.getElementById('status').style.color = '#166534';
  })
  .catch(() => {
    document.getElementById('status').textContent = '❌ Server offline — run Start TaxMate';
    document.getElementById('status').style.color = '#DC2626';
  });
