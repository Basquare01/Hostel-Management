const sections = Array.from(document.querySelectorAll('.page'));
const alertToast = document.getElementById('alertToast');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const applicationForm = document.getElementById('applicationForm');
const logoutButton = document.getElementById('logoutButton');
const logoutButtonAdmin = document.getElementById('logoutButtonAdmin');
const studentStatus = document.getElementById('studentStatus');
const allocationDetails = document.getElementById('allocationDetails');
const totalStudents = document.getElementById('totalStudents');
const allocatedStudents = document.getElementById('allocatedStudents');
const vacantBeds = document.getElementById('vacantBeds');
const adminTotalStudents = document.getElementById('adminTotalStudents');
const adminAllocated = document.getElementById('adminAllocated');
const adminVacant = document.getElementById('adminVacant');
const blockOverview = document.getElementById('blockOverview');
const allocationTableBody = document.getElementById('allocationTableBody');
const studentReportButton = document.getElementById('studentReportButton');
const adminReportButton = document.getElementById('adminReportButton');
const resetButton = document.getElementById('resetButton');
const profileChip = document.getElementById('profileChip');
const profileName = document.getElementById('profileName');
const profileRole = document.getElementById('profileRole');
const hostelSelect = document.getElementById('hostelSelect');
const blockSelect = document.getElementById('blockSelect');

const NAV_ACTIONS = document.querySelectorAll('[data-action="showSection"]');

const STORAGE_KEYS = {
  students: 'hostel_students',
  allocations: 'hostel_allocations',
  currentUser: 'hostel_current_user',
};

const hostelConfig = {
  hostels: {
    Danfodio: ['A', 'B', 'C', 'D', 'E', 'F'],
    Dangote: ['A', 'B', 'C', 'D', 'E', 'F'],
    Icsa: ['A', 'B', 'C', 'D', 'E', 'F'],
    Ramat: ['A', 'B', 'C', 'D', 'E', 'F'],
    'Shehu Idris': ['A', 'B', 'C', 'D', 'E', 'F'],
    Akinzuwa: ['A', 'B', 'C'],
  },
  roomsPerBlock: 8,
  bedsPerRoom: 2,
};

const managerAccount = {
  email: 'admin@hostel.com',
  matric: 'ADMIN',
  password: 'Admin@123',
  role: 'admin',
};

function showSection(targetId) {
  sections.forEach((section) => {
    section.classList.toggle('active', section.id === targetId);
  });
}

function showToast(message, type = 'info') {
  alertToast.textContent = message;
  alertToast.className = `toast show ${type}`;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    alertToast.classList.remove('show');
  }, 3000);
}

function readStorage(key) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStudents() {
  return readStorage(STORAGE_KEYS.students) || [];
}

function getAllocations() {
  return readStorage(STORAGE_KEYS.allocations) || [];
}

function setCurrentUser(user) {
  writeStorage(STORAGE_KEYS.currentUser, user);
}

function getCurrentUser() {
  return readStorage(STORAGE_KEYS.currentUser);
}

function generateRoomList() {
  const rooms = [];
  Object.entries(hostelConfig.hostels).forEach(([hostel, blocks]) => {
    blocks.forEach((block) => {
      for (let number = 1; number <= hostelConfig.roomsPerBlock; number += 1) {
        rooms.push({
          hostel,
          block,
          roomNumber: number,
          type: number % 4 === 0 ? 'Deluxe' : 'Standard',
          capacity: hostelConfig.bedsPerRoom,
        });
      }
    });
  });
  return rooms;
}

function findRoomAvailability(allocations) {
  const roomCount = new Map();
  allocations.forEach((allocation) => {
    const key = `${allocation.hostel}-${allocation.block}-${allocation.roomNumber}`;
    roomCount.set(key, (roomCount.get(key) || 0) + 1);
  });
  return roomCount;
}

function allocateRoom(student, preferences) {
  const allocations = getAllocations();
  const roomMap = findRoomAvailability(allocations);
  const rooms = generateRoomList().filter((room) => room.type === preferences.roomType);
  const prioritized = rooms.sort((a, b) => {
    if (a.hostel === preferences.preferredHostel && b.hostel !== preferences.preferredHostel) return -1;
    if (a.hostel !== preferences.preferredHostel && b.hostel === preferences.preferredHostel) return 1;
    if (a.block === preferences.preferredBlock && b.block !== preferences.preferredBlock) return -1;
    if (a.block !== preferences.preferredBlock && b.block === preferences.preferredBlock) return 1;
    return a.hostel.localeCompare(b.hostel) || a.block.localeCompare(b.block) || a.roomNumber - b.roomNumber;
  });

  const selected = prioritized.find((room) => {
    const key = `${room.hostel}-${room.block}-${room.roomNumber}`;
    return (roomMap.get(key) || 0) < room.capacity;
  });

  if (!selected) {
    return null;
  }

  return {
    studentMatric: student.matric,
    studentName: student.name,
    department: student.department,
    hostel: selected.hostel,
    block: selected.block,
    roomNumber: selected.roomNumber,
    roomType: selected.type,
    gender: student.gender,
    term: preferences.term,
    notes: preferences.notes,
    submittedAt: new Date().toISOString(),
  };
}

function updateDashboard() {
  const students = getStudents();
  const allocations = getAllocations();
  const allocatedCount = allocations.length;
  const capacity = Object.values(hostelConfig.hostels).reduce(
    (sum, blocks) => sum + blocks.length * hostelConfig.roomsPerBlock * hostelConfig.bedsPerRoom,
    0,
  );
  const vacant = Math.max(capacity - allocatedCount, 0);

  totalStudents.textContent = students.length;
  allocatedStudents.textContent = allocatedCount;
  vacantBeds.textContent = vacant;
  adminTotalStudents.textContent = students.length;
  adminAllocated.textContent = allocatedCount;
  adminVacant.textContent = vacant;
  blockOverview.innerHTML = Object.entries(hostelConfig.hostels)
    .map(([hostel, blocks]) => {
      const count = allocations.filter((item) => item.hostel === hostel).length;
      const capacityPerHostel = blocks.length * hostelConfig.roomsPerBlock * hostelConfig.bedsPerRoom;
      return `
        <div class="block-card">
          <div>
            <strong>${hostel}</strong>
            <span>${count} / ${capacityPerHostel} beds occupied</span>
          </div>
          <div>${Math.round((count / capacityPerHostel) * 100)}%</div>
        </div>
      `;
    })
    .join('');

  allocationTableBody.innerHTML = allocations
    .map(
      (allocation) => `
      <tr>
        <td>${allocation.studentName}</td>
        <td>${allocation.studentMatric}</td>
        <td>${allocation.department}</td>
        <td>Allocated</td>
        <td>${allocation.hostel} - Block ${allocation.block} - ${allocation.roomNumber}</td>
      </tr>
    `,
    )
    .join('');
}

function renderStudentStatus(user) {
  const allocations = getAllocations();
  const allocation = allocations.find((item) => item.studentMatric === user.matric);

  if (!allocation) {
    studentStatus.textContent = 'No hostel application submitted yet.';
    allocationDetails.classList.add('hidden');
    return;
  }

  studentStatus.textContent = 'Your room has been allocated.';
  allocationDetails.classList.remove('hidden');
  allocationDetails.innerHTML = `
    <p><strong>Hostel:</strong> ${allocation.hostel}</p>
    <p><strong>Block:</strong> ${allocation.block}</p>
    <p><strong>Room:</strong> ${allocation.roomNumber}</p>
    <p><strong>Room Type:</strong> ${allocation.roomType}</p>
    <p><strong>Term:</strong> ${allocation.term}</p>
    <p><strong>Submitted:</strong> ${new Date(allocation.submittedAt).toLocaleString()}</p>
  `;
}

function setProfile(user) {
  if (!profileChip || !profileName || !profileRole) return;
  profileChip.classList.remove('hidden');
  profileName.textContent = user.name ? user.name : 'Hostel User';
  profileRole.textContent = user.role === 'admin' ? 'Manager' : 'Student';
}

function clearProfile() {
  if (!profileChip || !profileName || !profileRole) return;
  profileChip.classList.add('hidden');
  profileName.textContent = 'Guest';
  profileRole.textContent = 'Visitor';
}

function populateBlocks(hostel) {
  if (!blockSelect) return;
  const blocks = hostelConfig.hostels[hostel] || [];
  blockSelect.innerHTML = '<option value="">Select preference</option>' +
    blocks.map((block) => `<option value="${block}">Block ${block}</option>`).join('');
}

function showDashboard(user) {
  setProfile(user);
  if (user.role === 'admin') {
    showSection('adminDashboard');
  } else {
    showSection('studentDashboard');
    renderStudentStatus(user);
  }
  updateDashboard();
}

function initialize() {
  NAV_ACTIONS.forEach((button) => {
    button.addEventListener('click', () => showSection(button.dataset.target));
  });

  const currentUser = getCurrentUser();
  if (currentUser) {
    showDashboard(currentUser);
  } else {
    clearProfile();
    showSection('landing');
  }

  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  if (applicationForm) {
    applicationForm.addEventListener('submit', handleApplication);
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  if (logoutButtonAdmin) {
    logoutButtonAdmin.addEventListener('click', handleLogout);
  }

  if (studentReportButton) {
    studentReportButton.addEventListener('click', () => generateReport('student'));
  }

  if (adminReportButton) {
    adminReportButton.addEventListener('click', () => generateReport('admin'));
  }

  if (resetButton) {
    resetButton.addEventListener('click', resetSystem);
  }

  if (hostelSelect) {
    hostelSelect.addEventListener('change', (event) => {
      populateBlocks(event.target.value);
    });
  }

  if (hostelSelect && hostelSelect.value) {
    populateBlocks(hostelSelect.value);
  }
}

function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const student = {
    name: formData.get('name').trim(),
    matric: formData.get('matric').trim().toUpperCase(),
    email: formData.get('email').trim().toLowerCase(),
    department: formData.get('department').trim(),
    year: formData.get('year'),
    gender: formData.get('gender'),
    password: formData.get('password'),
    role: 'student',
    registeredAt: new Date().toISOString(),
  };

  const students = getStudents();
  if (!student.name || !student.matric || !student.email || !student.password) {
    showToast('Please complete all required registration fields.', 'error');
    return;
  }

  const duplicate = students.some(
    (existing) => existing.matric === student.matric || existing.email === student.email,
  );
  if (duplicate) {
    showToast('A student with that matric number or email already exists.', 'error');
    return;
  }

  students.push(student);
  writeStorage(STORAGE_KEYS.students, students);
  setCurrentUser(student);
  form.reset();
  showToast('Registration successful. Welcome to HostelX!', 'success');
  showDashboard(student);
}

function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const identifier = formData.get('identifier').trim();
  const password = formData.get('password');

  if (!identifier || !password) {
    showToast('Enter your matric number/email and password to login.', 'error');
    return;
  }

  if (
    identifier.toLowerCase() === managerAccount.email &&
    password === managerAccount.password
  ) {
    setCurrentUser(managerAccount);
    showToast('Admin login successful.', 'success');
    showDashboard(managerAccount);
    return;
  }

  const students = getStudents();
  const student = students.find(
    (record) =>
      record.password === password &&
      (record.matric === identifier.toUpperCase() || record.email === identifier.toLowerCase()),
  );

  if (!student) {
    showToast('No matching student account found. Check your credentials.', 'error');
    return;
  }

  setCurrentUser(student);
  showToast(`Login successful. Welcome back, ${student.name.split(' ')[0]}!`, 'success');
  showDashboard(student);
}

function handleReallocation(currentUser, preferences) {
  const allocations = getAllocations();
  const replacement = allocateRoom(currentUser, preferences);
  if (!replacement) {
    showToast('No rooms available matching your new preference.', 'error');
    return false;
  }

  const updatedAllocations = allocations.map((item) =>
    item.studentMatric === currentUser.matric ? replacement : item,
  );
  writeStorage(STORAGE_KEYS.allocations, updatedAllocations);
  showToast('Room changed successfully. Your allocation is updated.', 'success');
  renderStudentStatus(currentUser);
  updateDashboard();
  return true;
}

function handleApplication(event) {
  event.preventDefault();
  const currentUser = getCurrentUser();

  if (!currentUser || currentUser.role === 'admin') {
    showToast('You must log in as a student to submit an application.', 'error');
    return;
  }

  const formData = new FormData(event.target);
  const preferences = {
    preferredHostel: formData.get('preferredHostel'),
    preferredBlock: formData.get('preferredBlock'),
    roomType: formData.get('roomType'),
    term: formData.get('term').trim(),
    notes: formData.get('notes').trim(),
  };

  const allocations = getAllocations();
  const existingAllocation = allocations.find((item) => item.studentMatric === currentUser.matric);
  if (existingAllocation) {
    handleReallocation(currentUser, preferences);
    return;
  }

  const allocation = allocateRoom(currentUser, preferences);
  if (!allocation) {
    showToast('No rooms available that match your preference. Please try again later.', 'error');
    return;
  }

  allocations.push(allocation);
  writeStorage(STORAGE_KEYS.allocations, allocations);
  showToast('Room allocated successfully! See your updated dashboard.', 'success');
  renderStudentStatus(currentUser);
  updateDashboard();
}

function handleLogout() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  clearProfile();
  showToast('You have been logged out.', 'info');
  showSection('landing');
}

function generateReport(type) {
  const students = getStudents();
  const allocations = getAllocations();
  const headers = ['Name', 'Matric', 'Department', 'Gender', 'Status', 'Hostel', 'Block', 'Room', 'Room Type', 'Term'];
  const rows = students.map((student) => {
    const allocation = allocations.find((item) => item.studentMatric === student.matric);
    return [
      student.name,
      student.matric,
      student.department,
      student.gender,
      allocation ? 'Allocated' : 'Pending',
      allocation ? allocation.block : 'N/A',
      allocation ? allocation.roomNumber : 'N/A',
      allocation ? allocation.roomType : 'N/A',
      allocation ? allocation.term : 'N/A',
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = type === 'admin' ? 'hostel-report.csv' : 'student-report.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function resetSystem() {
  const shouldReset = confirm('Resetting will clear all saved students and allocations. Continue?');
  if (!shouldReset) {
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.students);
  localStorage.removeItem(STORAGE_KEYS.allocations);
  localStorage.removeItem(STORAGE_KEYS.currentUser);
  showToast('System reset complete. All data cleared.', 'info');
  showSection('landing');
}

initialize();
