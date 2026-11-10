import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, getDocs, doc, setDoc, getDoc, deleteDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// --- સેન્ટ્રલ ફાયરબેઝ કન્ફિગરેશન ---
const firebaseConfig = {
    apiKey: "AIzaSyCMhWWI_6oxPIVEQEVlq2SIBf72EI2o8NI",
    authDomain: "gram-panchayat-33c86.firebaseapp.com",
    projectId: "gram-panchayat-33c86",
    storageBucket: "gram-panchayat-33c86.firebasestorage.app",
    messagingSenderId: "1025176315779",
    appId: "1:1025176315779:web:a24ca10a06c55edcc8f8b6",
    measurementId: "G-TQBSXCWNBV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// --- ૦. URL માંથી LGD Code પકડવો ---
const urlParams = new URLSearchParams(window.location.search);
const lgdCode = urlParams.get('id');

if (!lgdCode) {
    alert("⚠️ ભૂલ: LGD Code (પંચાયત ID) મળ્યો નથી! કૃપા કરીને સુપર એડમિન પેનલમાંથી યોગ્ય લિંક દ્વારા પ્રવેશ કરો.");
}

// LGD Code આધારિત Sub-Collection Helper
function getPanchayatCol(subColName) {
    return collection(db, "panchayats", lgdCode, subColName);
}

function getPanchayatDoc(subColName, docId) {
    return doc(db, "panchayats", lgdCode, subColName, docId);
}

// --- LGD Code & Password આધારિત Custom Login System ---
const loginModal = document.getElementById("login-modal");
const adminDashboard = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("admin-login-form");

async function checkAdminAuth() {
    if (!lgdCode) return;
    
    if (sessionStorage.getItem(`admin_logged_${lgdCode}`) === "true") {
        if (loginModal) loginModal.classList.add("hidden");
        if (adminDashboard) adminDashboard.classList.remove("hidden");
        initAdminPanel();
    } else {
        if (loginModal) loginModal.classList.remove("hidden");
        if (adminDashboard) adminDashboard.classList.add("hidden");
    }
}

loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const enteredPass = document.getElementById("login-password")?.value.trim();

    try {
        const panchayatDocRef = doc(db, "panchayats", lgdCode);
        const snap = await getDoc(panchayatDocRef);

        if (snap.exists()) {
            const data = snap.data();
            const correctPass = data.adminPassword || "admin123";

            if (enteredPass === correctPass) {
                sessionStorage.setItem(`admin_logged_${lgdCode}`, "true");
                if (loginModal) loginModal.classList.add("hidden");
                if (adminDashboard) adminDashboard.classList.remove("hidden");
                alert("સફળતાપૂર્વક લૉગિન થઈ ગયું!");
                initAdminPanel();
            } else {
                alert("ખોટો પાસવર્ડ! કૃપા કરીને સાચો પાસવર્ડ દાખલ કરો.");
            }
        } else {
            alert("આ LGD Code વાળી પંચાયત મળી નથી.");
        }
    } catch (err) {
        console.error("Login error:", err);
        alert("લૉગિન કરવામાં ભૂલ આવી: " + err.message);
    }
});

// Logout Button
document.getElementById("logout-btn")?.addEventListener("click", () => {
    sessionStorage.removeItem(`admin_logged_${lgdCode}`);
    checkAdminAuth();
});

checkAdminAuth();

// તમામ ફંક્શન્સને એકસાથે રન કરવા માટેનું ઇનિશિયલાઈઝર
function initAdminPanel() {
    loadWebsiteSettings();
    loadAdminPosts();
    loadNotices();
    loadAdminGallery();
    loadAdminMenuList();
    loadAdminComplaints();
    loadComplaintConfig();
    loadAdminMeta();
    loadAdminStaffAndCommittee();
    loadAdminSchedule();
    loadActiveCommittees();
    loadAdminTaxLink();
    loadAdminCustomButtons();
    loadAdminEvents();
    fetchDisasterContent();
    fetchExistingMapLinks();
    loadAdminGlanceList();
    loadContactAdminData();
    loadAdminFeedbacks();
    loadProactiveAdminData();
}

// --- ૧. વેબસાઇટ સેટિંગ્સ લાઈવ પ્રીવ્યુ ---
async function loadWebsiteSettings() {
    if (!lgdCode) return;
    const snap = await getDoc(getPanchayatDoc("settings", "general"));
    if (snap.exists()) {
        const data = snap.data();
        if (document.getElementById("set-gp-name")) document.getElementById("set-gp-name").value = data.name || "";
        if (document.getElementById("set-gp-tagline")) document.getElementById("set-gp-tagline").value = data.tagline || "";
        
        const preview = document.getElementById("settings-preview");
        if (preview) {
            preview.innerHTML = `
                <div class="bg-white p-2.5 rounded-lg border border-emerald-300 mt-2 text-xs">
                    <p class="font-bold text-emerald-900">📌 વર્તમાન સેવ થયેલ વિગત:</p>
                    <p><b>પંચાયત:</b> ${data.name || 'નથી સેટ કરી'}</p>
                    <p><b>ટેગ લાઇન:</b> ${data.tagline || 'નથી સેટ કરી'}</p>
                </div>
            `;
        }
    }
}

document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("set-gp-name")?.value.trim();
    const tagline = document.getElementById("set-gp-tagline")?.value.trim();

    await setDoc(getPanchayatDoc("settings", "general"), { name, tagline, updatedAt: new Date() }, { merge: true });
    alert("સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગયા!");
    loadWebsiteSettings();
});

// --- ૨. તાજી પોસ્ટ્સ અને ન્યૂઝ મેનેજર ---
let postsCache = {};
function loadAdminPosts() {
    const container = document.getElementById("admin-posts-list");
    if (!container || !lgdCode) return;

    onSnapshot(getPanchayatCol("posts"), (snapshot) => {
        container.innerHTML = "";
        postsCache = {};
        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">કોઈ પોસ્ટ કે ન્યૂઝ મળેલી નથી.</p>`;
            return;
        }
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            postsCache[id] = data;

            container.innerHTML += `
                <div class="bg-gray-50 border p-2 rounded flex justify-between items-start text-xs mb-1">
                    <div>
                        <h5 class="font-bold text-emerald-800">${data.title}</h5>
                        <p class="text-gray-600 text-[11px]">${data.desc || ''}</p>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="editPost('${id}')" class="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]">એડિટ</button>
                        <button onclick="deletePost('${id}')" class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px]">ડિલીટ</button>
                    </div>
                </div>
            `;
        });
    });
}

document.getElementById("add-post-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-post-id").value;
    const title = document.getElementById("post-title").value.trim();
    const desc = document.getElementById("post-desc").value.trim();

    if (editId) {
        await updateDoc(getPanchayatDoc("posts", editId), { title, desc, updatedAt: new Date() });
    } else {
        await addDoc(getPanchayatCol("posts"), { title, desc, createdAt: new Date() });
    }
    document.getElementById("add-post-form").reset();
    document.getElementById("edit-post-id").value = "";
    alert("પોસ્ટ સાચવવામાં આવી!");
});

window.editPost = (id) => {
    const data = postsCache[id];
    if (!data) return;
    document.getElementById('edit-post-id').value = id;
    document.getElementById('post-title').value = data.title || "";
    document.getElementById('post-desc').value = data.desc || "";
};
window.deletePost = async (id) => {
    if (confirm("પોસ્ટ ડિલીટ કરવી છે?")) await deleteDoc(getPanchayatDoc("posts", id));
};

// --- ૩. નોટિસ મેનેજર ---
let noticesCache = {};
function loadNotices() {
    const container = document.getElementById("admin-notices-list");
    if (!container || !lgdCode) return;

    onSnapshot(getPanchayatCol("notices"), (snapshot) => {
        container.innerHTML = "";
        noticesCache = {};
        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">કોઈ નોટિસ નથી.</p>`;
            return;
        }
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            noticesCache[id] = data;

            container.innerHTML += `
                <div class="bg-gray-50 border p-2 rounded flex justify-between items-start text-xs mb-1">
                    <div>
                        <h4 class="font-bold text-gray-800">${data.title}</h4>
                        <p class="text-gray-600 text-[11px]">${data.desc || ''}</p>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="editNotice('${id}')" class="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px]">એડિટ</button>
                        <button onclick="deleteNotice('${id}')" class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px]">ડિલીટ</button>
                    </div>
                </div>
            `;
        });
    });
}

document.getElementById("add-notice-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-notice-id").value;
    const title = document.getElementById("notice-title").value.trim();
    const desc = document.getElementById("notice-desc").value.trim();

    if (editId) {
        await updateDoc(getPanchayatDoc("notices", editId), { title, desc, updatedAt: new Date() });
    } else {
        await addDoc(getPanchayatCol("notices"), { title, desc, createdAt: new Date() });
    }
    document.getElementById("add-notice-form").reset();
    document.getElementById("edit-notice-id").value = "";
    alert("નોટિસ સાચવી લેવાઈ!");
});

window.editNotice = (id) => {
    const data = noticesCache[id];
    if (!data) return;
    document.getElementById('edit-notice-id').value = id;
    document.getElementById('notice-title').value = data.title || "";
    document.getElementById('notice-desc').value = data.desc || "";
};
window.deleteNotice = async (id) => {
    if (confirm("નોટિસ ડિલીટ કરવી છે?")) await deleteDoc(getPanchayatDoc("notices", id));
};

// --- ૪. Blogger ફોટો ગેલેરી મેનેજર (૨૦ ફોટા લિમિટ & સ્ક્રોલ લિસ્ટ) ---
document.getElementById("gallery-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("img-title").value.trim();
    const url = document.getElementById("img-url").value.trim();

    const snap = await getDocs(getPanchayatCol("gallery"));
    if (snap.size >= 20) {
        alert("⚠️ ગેલેરી લિમિટ પૂરી થઈ ગઈ છે! તમે ફક્ત મહત્તમ ૨૦ ફોટા જ ઉમેરી શકો છો.");
        return;
    }

    await addDoc(getPanchayatCol("gallery"), { title, imageUrl: url, createdAt: new Date() });
    alert("ફોટો ઉમેરાઈ ગયો!");
    e.target.reset();
    loadAdminGallery();
});

async function loadAdminGallery() {
    const container = document.getElementById("admin-gallery-list");
    if (!container || !lgdCode) return;

    const snap = await getDocs(getPanchayatCol("gallery"));
    container.innerHTML = "";
    
    const countEl = document.getElementById("gallery-count");
    if (countEl) countEl.innerText = `કુલ ફોટા: ${snap.size} / 20`;

    if (snap.empty) {
        container.innerHTML = "<p class='text-xs text-gray-500'>કોઈ ફોટો નથી.</p>";
        return;
    }

    snap.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        container.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs mb-1">
                <div class="flex items-center gap-2 overflow-hidden">
                    <img src="${item.imageUrl}" class="w-8 h-8 object-cover rounded flex-shrink-0">
                    <span class="font-semibold text-gray-700 truncate">${item.title}</span>
                </div>
                <button onclick="deleteGalleryImg('${id}')" class="bg-red-600 text-white text-[10px] px-2 py-1 rounded">ડિલીટ</button>
            </div>
        `;
    });
}

window.deleteGalleryImg = async (id) => {
    if (confirm("આ ફોટો કાઢી નાખવો છે?")) {
        await deleteDoc(getPanchayatDoc("gallery", id));
        loadAdminGallery();
    }
};

// --- ૫. ગામ અને પંચાયત વિગત (Quill Editor) ---
let menuQuill = null;
if (document.getElementById('menu-editor-container')) {
    menuQuill = new Quill('#menu-editor-container', {
        theme: 'snow',
        modules: { toolbar: [['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }]] }
    });
}

document.getElementById("add-menu-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-menu-id").value;
    const title = document.getElementById("menu-title").value.trim();
    const content = menuQuill ? menuQuill.root.innerHTML : "";

    if (editId) {
        await setDoc(getPanchayatDoc("village_details", editId), { title, content, updatedAt: new Date() }, { merge: true });
    } else {
        await addDoc(getPanchayatCol("village_details"), { title, content, isShow: true, createdAt: new Date() });
    }

    document.getElementById("add-menu-form").reset();
    document.getElementById("edit-menu-id").value = "";
    if (menuQuill) menuQuill.root.innerHTML = "";
    alert("મેનૂ સેવ થઈ ગયું!");
    loadAdminMenuList();
});

async function loadAdminMenuList() {
    const container = document.getElementById("admin-menu-list");
    if (!container || !lgdCode) return;

    const snap = await getDocs(getPanchayatCol("village_details"));
    container.innerHTML = "";
    if (snap.empty) {
        container.innerHTML = "<p class='text-xs text-gray-500'>કોઈ મેનૂ મળેલ નથી.</p>";
        return;
    }

    snap.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        const isShow = item.isShow !== false;

        container.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 border rounded text-xs mb-1">
                <span class="font-semibold ${isShow ? 'text-gray-800' : 'text-gray-400 line-through'}">${item.title}</span>
                <div class="flex gap-1">
                    <button onclick="editMenu('${id}')" class="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded">એડિટ</button>
                    <button onclick="toggleMenu('${id}', ${isShow})" class="text-white text-[10px] px-2 py-0.5 rounded ${isShow ? 'bg-amber-600' : 'bg-gray-500'}">${isShow ? 'સંતાડો' : 'બતાવો'}</button>
                    <button onclick="deleteMenu('${id}')" class="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded">ડિલીટ</button>
                </div>
            </div>
        `;
    });
}

window.editMenu = async (id) => {
    const snap = await getDoc(getPanchayatDoc("village_details", id));
    if (snap.exists()) {
        const data = snap.data();
        document.getElementById("edit-menu-id").value = id;
        document.getElementById("menu-title").value = data.title || "";
        if (menuQuill) menuQuill.root.innerHTML = data.content || "";
    }
};

window.toggleMenu = async (id, currentStatus) => {
    await setDoc(getPanchayatDoc("village_details", id), { isShow: !currentStatus }, { merge: true });
    loadAdminMenuList();
};

window.deleteMenu = async (id) => {
    if (confirm("આ મેનૂ ડિલીટ કરવું છે?")) {
        await deleteDoc(getPanchayatDoc("village_details", id));
        loadAdminMenuList();
    }
};

// --- ૬. આવેલ ફરિયાદો, સેટિંગ્સ & PDF રિપોર્ટ ---
async function loadComplaintConfig() {
    const snap = await getDoc(getPanchayatDoc("settings", "complaint_config"));
    if (snap.exists() && document.getElementById("complaint-section-status")) {
        document.getElementById("complaint-section-status").value = snap.data().isEnabled ? "true" : "false";
    }
}

document.getElementById("save-complaint-config-btn")?.addEventListener("click", async () => {
    const isEnabled = document.getElementById("complaint-section-status").value === "true";
    await setDoc(getPanchayatDoc("settings", "complaint_config"), { isEnabled, updatedAt: new Date() }, { merge: true });
    alert("ફરિયાદ વિભાગ સ્ટેટસ સેટિંગ્સ સેવ થઈ ગયા!");
});

async function loadAdminComplaints() {
    const filter = document.getElementById("admin-complaint-filter")?.value || "ALL";
    const snap = await getDocs(getPanchayatCol("complaints"));
    const container = document.getElementById("admin-complaint-list");
    if (!container || !lgdCode) return;

    container.innerHTML = "";
    if (snap.empty) {
        container.innerHTML = `<p class="text-xs text-gray-500">કોઈ ફરિયાદ મળેલી નથી.</p>`;
        return;
    }

    snap.forEach(d => {
        const item = d.data();
        const isPending = item.status?.includes("પેન્ડિંગ") || item.status?.includes("ચાલ");
        if (filter === "PENDING" && !isPending) return;

        container.innerHTML += `
            <div class="bg-white p-2.5 border rounded shadow-sm text-xs mb-2">
                <div class="flex justify-between font-bold border-b pb-1">
                    <span>નામ: ${item.name || 'અનામી'} (મો: ${item.mobile || '-'})</span>
                    <span class="text-emerald-700">${item.type || ''}</span>
                </div>
                <p class="mt-1"><b>ફળિયું/મકાન:</b> ${item.faliya || ''} / ${item.house || ''}</p>
                <p class="mt-1 text-gray-700"><b>ફરિયાદ:</b> ${item.msg || item.details || ''}</p>
                <div class="flex items-center gap-2 mt-2 pt-1 border-t">
                    <label class="font-bold text-gray-700">સ્ટેટસ:</label>
                    <select onchange="updateComplaintStatus('${d.id}', this.value)" class="border p-1 rounded bg-amber-50 text-[11px] flex-1">
                        <option value="${item.status || 'Pending'}" selected>હાલનું: ${item.status || 'Pending'}</option>
                        <option value="ફરિયાદ પર કામ ચાલી રહ્યું છે">ફરિયાદ પર કામ ચાલી રહ્યું છે</option>
                        <option value="ફરિયાદ નિવારણ થઈ ગયું છે">ફરિયાદ નિવારણ થઈ ગયું છે</option>
                        <option value="ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે">ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે</option>
                        <option value="ફરિયાદ અયોગ્ય હોય રદ કરવામાં આવેલ છે">ફરિયાદ અયોગ્ય હોય રદ કરવામાં આવેલ છે</option>
                    </select>
                </div>
            </div>
        `;
    });
}

window.updateComplaintStatus = async (id, status) => {
    await updateDoc(getPanchayatDoc("complaints", id), { status });
    alert("સ્ટેટસ અપડેટ થઈ ગયું!");
    loadAdminComplaints();
};
document.getElementById("admin-complaint-filter")?.addEventListener("change", loadAdminComplaints);

// --- ૭. પંચાયત કમિટી અને સ્ટાફ મેનેજર ---
async function loadAdminMeta() {
    if (!lgdCode) return;
    const snap = await getDoc(getPanchayatDoc("panchayat_meta", "staff_page"));
    if (snap.exists()) {
        const data = snap.data();
        if (document.getElementById("admin-term-input")) document.getElementById("admin-term-input").value = data.term || "";
        if (document.getElementById("admin-note-input")) document.getElementById("admin-note-input").value = data.note || "";
    }
}

document.getElementById("save-meta-btn")?.addEventListener("click", async () => {
    const term = document.getElementById("admin-term-input")?.value || "";
    const note = document.getElementById("admin-note-input")?.value || "";
    await setDoc(getPanchayatDoc("panchayat_meta", "staff_page"), { term, note }, { merge: true });
    alert("મુદત અને નોંધ સેવ થયા!");
});

async function loadAdminStaffAndCommittee() {
    const commContainer = document.getElementById("admin-committee-list");
    const staffContainer = document.getElementById("admin-staff-list");

    if (commContainer) {
        const snap = await getDocs(getPanchayatCol("panchayat_committee"));
        commContainer.innerHTML = "";
        snap.forEach(d => {
            const item = d.data();
            commContainer.innerHTML += `
                <div class="flex justify-between items-center bg-white p-1.5 border rounded text-xs mb-1">
                    <span><b>${item.name}</b> (${item.designation})</span>
                    <button onclick="deleteStaffComm('panchayat_committee', '${d.id}')" class="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">ડિલીટ</button>
                </div>
            `;
        });
    }

    if (staffContainer) {
        const snap = await getDocs(getPanchayatCol("panchayat_staff"));
        staffContainer.innerHTML = "";
        snap.forEach(d => {
            const item = d.data();
            staffContainer.innerHTML += `
                <div class="flex justify-between items-center bg-white p-1.5 border rounded text-xs mb-1">
                    <span><b>${item.name}</b> (${item.designation})</span>
                    <button onclick="deleteStaffComm('panchayat_staff', '${d.id}')" class="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">ડિલીટ</button>
                </div>
            `;
        });
    }
}

window.deleteStaffComm = async (col, id) => {
    if (confirm("ડિલીટ કરવું છે?")) {
        await deleteDoc(getPanchayatDoc(col, id));
        loadAdminStaffAndCommittee();
    }
};

document.getElementById("add-member-staff-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("ms-category").value;
    const colName = type === 'committee' ? 'panchayat_committee' : 'panchayat_staff';
    const payload = {
        name: document.getElementById("ms-name").value,
        designation: document.getElementById("ms-desig").value,
        mobile: document.getElementById("ms-mobile").value,
        ward: document.getElementById("ms-ward").value || '',
        order: Date.now()
    };
    await addDoc(getPanchayatCol(colName), payload);
    alert("સભ્ય/કર્મચારી ઉમેરાઈ ગયા!");
    e.target.reset();
    loadAdminStaffAndCommittee();
});

// --- ૮. અધિકારી/કર્મચારી સમય પત્રક ---
async function loadAdminSchedule() {
    const container = document.getElementById("admin-schedule-list");
    if (!container || !lgdCode) return;
    const snap = await getDocs(getPanchayatCol("panchayat_schedule"));
    container.innerHTML = "";
    snap.forEach(d => {
        const item = d.data();
        container.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 border rounded text-xs mb-1">
                <div><b>${item.name}</b> (${item.designation}) - ${item.timing}</div>
                <button onclick="deleteSchedule('${d.id}')" class="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">ડિલીટ</button>
            </div>
        `;
    });
}

window.deleteSchedule = async (id) => {
    if (confirm("ડિલીટ કરવું છે?")) {
        await deleteDoc(getPanchayatDoc("panchayat_schedule", id));
        loadAdminSchedule();
    }
};

document.getElementById("add-schedule-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById("sch-name").value,
        designation: document.getElementById("sch-desig").value,
        timing: document.getElementById("sch-timing").value,
        days: document.getElementById("sch-days").value,
        note: document.getElementById("sch-note").value || ''
    };
    await addDoc(getPanchayatCol("panchayat_schedule"), payload);
    alert("સમય પત્રક ઉમેરાઈ ગયું!");
    e.target.reset();
    loadAdminSchedule();
});

// --- ૯. કાર્યરત સમિતિઓ મેનેજર ---
async function loadActiveCommittees() {
    const container = document.getElementById("admin-committees-list");
    if (!container || !lgdCode) return;
    const snap = await getDocs(getPanchayatCol("active_committees"));
    container.innerHTML = "";
    snap.forEach(d => {
        const item = d.data();
        container.innerHTML += `
            <div class="bg-gray-50 border p-2 rounded text-xs mb-1">
                <div class="flex justify-between font-bold">
                    <span>${item.committeeName}</span>
                    <button onclick="deleteActiveComm('${d.id}')" class="bg-red-500 text-white px-1.5 py-0.5 rounded text-[10px]">ડિલીટ</button>
                </div>
            </div>
        `;
    });
}

window.deleteActiveComm = async (id) => {
    if (confirm("સમિતિ ડિલીટ કરવી છે?")) {
        await deleteDoc(getPanchayatDoc("active_committees", id));
        loadActiveCommittees();
    }
};

// --- ૧૦. મિલકત વેરા લિંક ---
async function loadAdminTaxLink() {
    if (!lgdCode) return;
    const snap = await getDoc(getPanchayatDoc("settings", "tax_payment"));
    if (snap.exists() && document.getElementById("tax-payment-url")) {
        document.getElementById("tax-payment-url").value = snap.data().url || "";
    }
}

document.getElementById("tax-link-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = document.getElementById("tax-payment-url").value.trim();
    await setDoc(getPanchayatDoc("settings", "tax_payment"), { url, updatedAt: new Date() }, { merge: true });
    alert("મિલકત વેરા લિંક સાચવવામાં આવી!");
});

// --- ૧૧. કસ્ટમ બટન અને પેજ મેનેજર ---
async function loadAdminCustomButtons() {
    const container = document.getElementById("admin-custom-buttons-list");
    if (!container || !lgdCode) return;
    const snap = await getDocs(getPanchayatCol("custom_pages"));
    container.innerHTML = "";
    snap.forEach(d => {
        const item = d.data();
        container.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs mb-1">
                <span><b>${item.buttonTitle}</b></span>
                <button onclick="deleteCustomBtn('${d.id}')" class="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">ડિલીટ</button>
            </div>
        `;
    });
}

window.deleteCustomBtn = async (id) => {
    if (confirm("બટન ડિલીટ કરવું છે?")) {
        await deleteDoc(getPanchayatDoc("custom_pages", id));
        loadAdminCustomButtons();
    }
};

document.getElementById("add-page-button-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const buttonTitle = document.getElementById("custom-btn-title").value;
    const htmlContent = document.getElementById("custom-page-html").value;
    await addDoc(getPanchayatCol("custom_pages"), { buttonTitle, htmlContent, createdAt: new Date() });
    alert("કસ્ટમ બટન સાચવવામાં આવ્યું!");
    e.target.reset();
    loadAdminCustomButtons();
});

// --- ૧૨. ઇવેન્ટ્સ મેનેજર ---
async function loadAdminEvents() {
    const container = document.getElementById("admin-events-list");
    if (!container || !lgdCode) return;
    const snap = await getDocs(getPanchayatCol("events"));
    container.innerHTML = "";
    snap.forEach(d => {
        const item = d.data();
        container.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs mb-1">
                <span><b>${item.eventName}</b> (${item.eventDate})</span>
                <button onclick="deleteEvent('${d.id}')" class="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded">ડિલીટ</button>
            </div>
        `;
    });
}

window.deleteEvent = async (id) => {
    if (confirm("ઇવેન્ટ ડિલીટ કરવી છે?")) {
        await deleteDoc(getPanchayatDoc("events", id));
        loadAdminEvents();
    }
};

document.getElementById("event-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        eventName: document.getElementById("event-name").value,
        eventDate: document.getElementById("event-date").value,
        eventLocation: document.getElementById("event-location").value
    };
    await addDoc(getPanchayatCol("events"), payload);
    alert("ઇવેન્ટ ઉમેરાઈ ગઈ!");
    e.target.reset();
    loadAdminEvents();
});

// --- ૧૩. આપત્તિ વ્યવસ્થાપન ---
async function fetchDisasterContent() {
    const key = document.getElementById('disaster-page-key')?.value;
    if (!key || !lgdCode) return;
    const snap = await getDoc(getPanchayatDoc("disaster_management", key));
    if (snap.exists() && document.getElementById('disaster-page-content')) {
        document.getElementById('disaster-page-content').value = snap.data().content || "";
    }
}

document.getElementById('disaster-page-key')?.addEventListener('change', fetchDisasterContent);
document.getElementById('disaster-management-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = document.getElementById('disaster-page-key').value;
    const content = document.getElementById('disaster-page-content').value;
    await setDoc(getPanchayatDoc("disaster_management", key), { content, updatedAt: new Date() }, { merge: true });
    alert("આપત્તિ વ્યવસ્થાપન પેજ અપડેટ થઈ ગયું!");
});

// --- ૧૪. સેટેલાઇટ & રેવન્યુ મેપ લિંક્સ ---
async function fetchExistingMapLinks() {
    if (!lgdCode) return;
    const snap = await getDoc(getPanchayatDoc("village_map_settings", "links"));
    if (snap.exists()) {
        if (document.getElementById('admin-satellite-url')) document.getElementById('admin-satellite-url').value = snap.data().satelliteUrl || "";
        if (document.getElementById('admin-revenue-pdf-url')) document.getElementById('admin-revenue-pdf-url').value = snap.data().revenuePdfUrl || "";
    }
}

document.getElementById('village-map-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const satelliteUrl = document.getElementById('admin-satellite-url').value.trim();
    const revenuePdfUrl = document.getElementById('admin-revenue-pdf-url').value.trim();
    await setDoc(getPanchayatDoc("village_map_settings", "links"), { satelliteUrl, revenuePdfUrl, updatedAt: new Date() }, { merge: true });
    alert("નક્શાની લિંક્સ સાચવાઈ ગઈ!");
});

// --- ૧૫. મારૂ ગામ - એક નજરમાં ---
async function loadAdminGlanceList() {
    const container = document.getElementById("admin-glance-list");
    if (!container || !lgdCode) return;
    const snap = await getDocs(getPanchayatCol("village_glance"));
    container.innerHTML = "";
    snap.forEach(d => {
        const item = d.data();
        container.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs mb-1">
                <span><b>${item.title}:</b> ${item.value}</span>
                <button onclick="deleteGlance('${d.id}')" class="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded">ડિલીટ</button>
            </div>
        `;
    });
}

window.deleteGlance = async (id) => {
    if (confirm("ડિલીટ કરવું છે?")) {
        await deleteDoc(getPanchayatDoc("village_glance", id));
        loadAdminGlanceList();
    }
};

document.getElementById("add-glance-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        sectionName: document.getElementById("glance-section").value,
        title: document.getElementById("glance-title").value,
        value: document.getElementById("glance-value").value,
        extraInfo: document.getElementById("glance-extra").value
    };
    await addDoc(getPanchayatCol("village_glance"), payload);
    alert("માહિતી ઉમેરાઈ ગઈ!");
    e.target.reset();
    loadAdminGlanceList();
});

// --- ૧૬. સંપર્ક પેજ વિગતો ---
async function loadContactAdminData() {
    if (!lgdCode) return;
    const snap = await getDoc(getPanchayatDoc("contact_info", "main_contact"));
    if (snap.exists()) {
        const data = snap.data();
        if (document.getElementById("adm-panchayat-name")) document.getElementById("adm-panchayat-name").value = data.panchayatName || "";
        if (document.getElementById("adm-address")) document.getElementById("adm-address").value = data.address || "";
        if (document.getElementById("adm-email")) document.getElementById("adm-email").value = data.email || "";
        if (document.getElementById("adm-phone")) document.getElementById("adm-phone").value = data.phone || "";
        if (document.getElementById("adm-extra")) document.getElementById("adm-extra").value = data.extraInfo || "";
    }
}

document.getElementById("contact-admin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        panchayatName: document.getElementById("adm-panchayat-name").value,
        address: document.getElementById("adm-address").value,
        email: document.getElementById("adm-email").value,
        phone: document.getElementById("adm-phone").value,
        extraInfo: document.getElementById("adm-extra").value
    };
    await setDoc(getPanchayatDoc("contact_info", "main_contact"), payload, { merge: true });
    alert("સંપર્ક વિગતો અપડેટ થઈ ગઈ!");
});

// --- ૧૭. યુઝર ફીડબેક લોડિંગ ---
function loadAdminFeedbacks() {
    const container = document.getElementById("admin-feedback-list");
    if (!container || !lgdCode) return;
    onSnapshot(getPanchayatCol("user_feedbacks"), (snapshot) => {
        container.innerHTML = "";
        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500">કોઈ પ્રતિભાવ મળેલ નથી.</p>`;
            return;
        }
        snapshot.forEach(d => {
            const data = d.data();
            container.innerHTML += `
                <div class="bg-gray-50 border p-2 rounded text-xs mb-1">
                    <div class="font-bold">${data.name} (${data.phone})</div>
                    <p>${data.message}</p>
                </div>
            `;
        });
    });
}

// --- ૧૮. સ્વયં જાહેર કરેલ માહિતી (Proactive Disclosure) ---
async function loadProactiveAdminData() {
    if (!lgdCode) return;
    const snap = await getDoc(getPanchayatDoc("proactive_disclosure", "main_data"));
    if (snap.exists()) {
        const data = snap.data();
        if (data.officer) {
            if (document.getElementById("off-name")) document.getElementById("off-name").value = data.officer.name || "";
            if (document.getElementById("off-phone")) document.getElementById("off-phone").value = data.officer.phone || "";
            if (document.getElementById("off-appeal")) document.getElementById("off-appeal").value = data.officer.appealOfficer || "";
        }
    }
}

document.getElementById("proactive-admin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const officer = {
        name: document.getElementById("off-name").value,
        phone: document.getElementById("off-phone").value,
        appealOfficer: document.getElementById("off-appeal").value
    };
    await setDoc(getPanchayatDoc("proactive_disclosure", "main_data"), { officer, updatedAt: new Date() }, { merge: true });
    alert("સ્વયં જાહેર કરેલ માહિતી સેવ થઈ!");
});
