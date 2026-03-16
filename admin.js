document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#registrationsTable tbody');
  const adminMessage = document.getElementById('adminMessage');
  const tabButtons = document.querySelectorAll('.tab-btn');
  let currentView = 'recruiters';

  function setAdminMessage(text, type) {
    adminMessage.textContent = text;
    adminMessage.className = `form-message ${type}`;
    adminMessage.style.display = text ? 'block' : 'none';
  }

  function getApiUrl() {
    if (currentView === 'faculty') return '/api/faculty';
    if (currentView === 'students') return '/api/students';
    return '/api/registrations';
  }

  function getColumns() {
    if (currentView === 'faculty') {
      return ['ID', 'Name', 'Email', 'Employee ID', 'Department', 'Role', 'Status', 'Actions'];
    }

    if (currentView === 'students') {
      return ['ID', 'Name', 'Email', 'Enrollment', 'Status', 'Actions'];
    }

    return ['ID', 'Company', 'Recruiter', 'Email', 'Phone', 'Type', 'Status', 'Actions'];
  }

  function buildTableHeader() {
    const headerRow = document.getElementById('tableHeader');
    headerRow.innerHTML = getColumns().map(col => `<th>${col}</th>`).join('');
  }

  function fetchRegistrations() {
    setAdminMessage('Loading records…', 'success');
    const token = localStorage.getItem('authToken') || '';
    fetch(getApiUrl(), { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.message || 'Unable to load records');
        renderRows(data.data);
        setAdminMessage('', '');
      })
      .catch(err => {
        setAdminMessage(err.message || 'Failed to load records.', 'error');
      });
  }

  function renderRows(items) {
    tableBody.innerHTML = '';

    if (!items.length) {
      tableBody.innerHTML = '<tr><td colspan="8" class="empty-state">No records found.</td></tr>';
      return;
    }

    items.forEach(item => {
      const row = document.createElement('tr');
      if (currentView === 'faculty') {
        row.innerHTML = `
          <td>${item.id}</td>
          <td>${item.fullName}</td>
          <td>${item.email}</td>
          <td>${item.employeeId}</td>
          <td>${item.department || '-'}</td>
          <td>${item.role}</td>
          <td><span class="status ${item.status}">${item.status}</span></td>
          <td class="actions">
            <button class="action-btn approve" data-id="${item.id}">Approve</button>
            <button class="action-btn reject" data-id="${item.id}">Reject</button>
          </td>
        `;
      } else if (currentView === 'students') {
        row.innerHTML = `
          <td>${item.id}</td>
          <td>${item.fullName}</td>
          <td>${item.email}</td>
          <td>${item.enrollmentNumber}</td>
          <td><span class="status ${item.status}">${item.status}</span></td>
          <td class="actions">
            <button class="action-btn approve" data-id="${item.id}">Approve</button>
            <button class="action-btn reject" data-id="${item.id}">Reject</button>
          </td>
        `;
      } else {
        row.innerHTML = `
          <td>${item.id}</td>
          <td>${item.companyName}</td>
          <td>${item.fullName}</td>
          <td>${item.email}</td>
          <td>${item.phone}</td>
          <td>${item.companyType}</td>
          <td><span class="status ${item.status}">${item.status}</span></td>
          <td class="actions">
            <button class="action-btn approve" data-id="${item.id}">Approve</button>
            <button class="action-btn reject" data-id="${item.id}">Reject</button>
          </td>
        `;
      }

      tableBody.appendChild(row);
    });

    tableBody.querySelectorAll('.action-btn').forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-id');
        const status = button.classList.contains('approve') ? 'approved' : 'rejected';
        updateStatus(id, status);
      });
    });
  }

  function updateStatus(id, status) {
    setAdminMessage('Updating status…', 'success');
    const baseUrl = getApiUrl();
    const token = localStorage.getItem('authToken') || '';
    fetch(`${baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status })
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.message || 'Unable to update status');
        setAdminMessage(`Record ${status}.`, 'success');
        fetchRegistrations();
      })
      .catch(err => {
        setAdminMessage(err.message || 'Failed to update status.', 'error');
      });
  }

  function setActiveTab(target) {
    currentView = target;
    tabButtons.forEach(button => {
      button.classList.toggle('active', button.getAttribute('data-target') === target);
    });
    buildTableHeader();
    fetchRegistrations();
  }

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      setActiveTab(button.getAttribute('data-target'));
    });
  });

  buildTableHeader();
  fetchRegistrations();
});
