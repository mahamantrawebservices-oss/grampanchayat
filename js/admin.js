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

// --- ૦. URL અથવા LocalStorage માંથી LGD Code પકડવો (ડબલ સેફ્ટી) ---
const urlParams = new URLSearchParams(window.location.search);
let lgdCode = urlParams.get('id');

if (lgdCode) {
    localStorage.setItem("currentPanchayatId", lgdCode);
} else {
    lgdCode = localStorage.getItem("currentPanchayatId");
}

if (!lgdCode) {
    alert("⚠️ ભૂલ: LGD Code (પંચાયત ID) મળ્યો નથી! કૃપા કરીને સુપર એડમિન પેનલમાંથી યોગ્ય લિંક દ્વારા પ્રવેશ કરો.");
} else {
    if (!window.location.search.includes("id=")) {
        window.history.replaceState({}, '', `${window.location.pathname}?id=${lgdCode}`);
    }
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
    // URL અથવા LocalStorage માંથી એક્ટિવ LGD Code મેળવો
    const currentParams = new URLSearchParams(window.location.search);
    let activeLgd = currentParams.get('id') || lgdCode || localStorage.getItem("currentPanchayatId");
    
    if (!activeLgd) return;
    
    if (sessionStorage.getItem(`admin_logged_${activeLgd}`) === "true") {
        if (loginModal) loginModal.classList.add("hidden");
        if (adminDashboard) adminDashboard.classList.remove("hidden");
        
        // ડાયનેમિક હેડર ટાઇટલ અને પેનલ ઇનિશિયલાઈઝ કરો
        if (typeof updateAdminHeaderTitle === 'function') {
            updateAdminHeaderTitle(activeLgd);
        }
        initAdminPanel();
        checkTalukaNotification();
    } else {
        if (loginModal) loginModal.classList.remove("hidden");
        if (adminDashboard) adminDashboard.classList.add("hidden");
    }
}

// 🌟 LGD Code અને Password બંને વેરિફાઈ કરવા માટેનું ફોર્મ સબમિટ ઇવેન્ટ
loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🛑 પેજ રિફ્રેશ થતું અટકાવવા માટે
    
    // યુઝરે ફોર્મમાં દાખલ કરેલા LGD Code અને Password મેળવો
    const enteredLgd = document.getElementById("login-lgd")?.value.trim();
    const enteredPass = document.getElementById("login-password")?.value.trim();

    if (!enteredLgd || !enteredPass) {
        alert("⚠️ કૃપા કરીને LGD Code અને પાસવર્ડ બંને દાખલ કરો.");
        return;
    }

    try {
        // ફાયરબેઝમાંથી તે LGD Code વાળું ડૉક્યુમેન્ટ ફેચ કરો
        const panchayatDocRef = doc(db, "panchayats", enteredLgd);
        const snap = await getDoc(panchayatDocRef);

        if (snap.exists()) {
            const data = snap.data();
            const correctPass = data.adminPassword || "admin123"; // ડિફોલ્ટ પાસવર્ડ સેફ્ટી

            if (enteredPass === correctPass) {
                // સેશન અને લોકલ સ્ટોરેજમાં LGD Code અને લોગિન સ્ટેટ સેવ કરો
                sessionStorage.setItem(`admin_logged_${enteredLgd}`, "true");
                localStorage.setItem("currentPanchayatId", enteredLgd);
                lgdCode = enteredLgd;

                if (loginModal) loginModal.classList.add("hidden");
                if (adminDashboard) adminDashboard.classList.remove("hidden");
                
                alert("✅ સફળતાપૂર્વક લૉગિન થઈ ગયું!");
                
                // હેડર ટાઇટલ અપડેટ કરો અને પેનલ શરૂ કરો
                if (typeof updateAdminHeaderTitle === 'function') {
                    updateAdminHeaderTitle(enteredLgd);
                }
                initAdminPanel();
            } else {
                alert("❌ ખોટો પાસવર્ડ! કૃપા કરીને સાચો પાસવર્ડ દાખલ કરો.");
            }
        } else {
            alert("❌ આ LGD Code વાળી પંચાયત સિસ્ટમમાં નોંધાયેલી નથી.");
        }
    } catch (err) {
        console.error("Login error:", err);
        alert("લૉગિન કરવામાં ભૂલ આવી: " + err.message);
    }
});

// Toggle Password Visibility (Eye Icon Click Event)
document.getElementById("toggle-password")?.addEventListener("click", () => {
    const passwordInput = document.getElementById("login-password");
    const eyeIcon = document.getElementById("eye-icon");

    if (passwordInput && eyeIcon) {
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            eyeIcon.classList.remove("fa-eye");
            eyeIcon.classList.add("fa-eye-slash"); // આંખ બંધ થયાનું આઇકન
        } else {
            passwordInput.type = "password";
            eyeIcon.classList.remove("fa-eye-slash");
            eyeIcon.classList.add("fa-eye"); // ખુલ્લી આંખનું આઇકન
        }
    }
});


// Logout Button (કન્ફર્મેશન સાથે)
document.getElementById("logout-btn")?.addEventListener("click", () => {
    if (confirm("શું તમે ખરેખર એડમિન પેનલમાંથી લોગઆઉટ કરવા માંગો છો?")) {
        const currentParams = new URLSearchParams(window.location.search);
        let activeLgd = currentParams.get('id') || lgdCode || localStorage.getItem("currentPanchayatId");
        if (activeLgd) {
            sessionStorage.removeItem(`admin_logged_${activeLgd}`);
        }
        checkAdminAuth();
    }
});

checkAdminAuth();

// એડમિન હેડરમાં પંચાયતનું નામ ડાયનેમિક સેટ કરવા માટેનું ફંક્શન
async function updateAdminHeaderTitle(activeLgd) {
    try {
        const snap = await getDoc(doc(db, "panchayats", activeLgd, "settings", "general"));
        const titleEl = document.getElementById("dashboard-header-title");
        
        if (snap.exists() && snap.data().name && titleEl) {
            titleEl.textContent = `ગ્રામ પંચાયત એડમિન પેનલ - ${snap.data().name}`;
        } else if (titleEl) {
            // જો નામ ન મળે તો ઓછામાં ઓછો LGD Code બતાવે
            titleEl.textContent = `ગ્રામ પંચાયત એડમિન પેનલ (LGD: ${activeLgd})`;
        }
    } catch (err) {
        console.error("Header Title Error:", err);
    }
}

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
    loadDownloadsAdminData();
    loadProactiveAdminData();
    loadPanchayatDataExchangeForm();
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
    if (!lgdCode) return;

    const titleInput = document.getElementById("img-title");
    const urlInput = document.getElementById("img-url");
    if (!titleInput || !urlInput) return;

    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    try {
        const galleryColRef = getPanchayatCol("gallery");
        const snap = await getDocs(galleryColRef);
        
        if (snap.size >= 20) {
            alert("⚠️ ગેલેરી લિમિટ પૂરી થઈ ગઈ છે! તમે ફક્ત મહત્તમ ૨૦ ફોટા જ ઉમેરી શકો છો.");
            return;
        }

        await addDoc(galleryColRef, { 
            title: title, 
            imageUrl: url, 
            createdAt: new Date() 
        });
        
        alert("✅ ફોટો સફળતાપૂર્વક ઉમેરાઈ ગયો!");
        e.target.reset();
        loadAdminGallery();
    } catch (err) {
        console.error("Add Gallery Error:", err);
        alert("ફોટો ઉમેરવામાં ટેકનિકલ ભૂલ આવી.");
    }
});

async function loadAdminGallery() {
    const container = document.getElementById("admin-gallery-list");
    if (!container || !lgdCode) return;

    try {
        const snap = await getDocs(getPanchayatCol("gallery"));
        container.innerHTML = "";
        
        const countEl = document.getElementById("gallery-count");
        if (countEl) countEl.innerText = `કુલ: ${snap.size} / 20`;

        if (snap.empty) {
            container.innerHTML = "<p class='text-xs text-gray-500 p-2'>હાલમાં કોઈ ફોટો નથી.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            container.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs mb-1">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <img src="${item.imageUrl}" class="w-8 h-8 object-cover rounded flex-shrink-0 border" onerror="this.src='https://via.placeholder.com/40'">
                        <span class="font-semibold text-gray-700 truncate">${item.title || 'ફોટો'}</span>
                    </div>
                    <button type="button" onclick="deleteGalleryImg('${id}')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded font-semibold">ડિલીટ</button>
                </div>
            `;
        });
    } catch (err) {
        console.error("Load Admin Gallery Error:", err);
    }
}

window.deleteGalleryImg = async (id) => {
    if (!lgdCode) return;
    if (confirm("શું તમે આ ફોટો કાઢી નાખવા માંગો છો?")) {
        try {
            await deleteDoc(getPanchayatDoc("gallery", id));
            alert("ફોટો સફળતાપૂર્વક ડિલીટ થઈ ગયો!");
            loadAdminGallery();
        } catch (err) {
            console.error("Delete Gallery Error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};
// --- ૪. Blogger ફોટો ગેલેરી મેનેજર (૨૦ ફોટા લિમિટ & સ્ક્રોલ લિસ્ટ કોડ પૂર્ણ) ---

// --- ૫. ગામ અને પંચાયત વિગત (Quill Editor) ---
let menuQuill = null;
if (document.getElementById('menu-editor-container')) {
    menuQuill = new Quill('#menu-editor-container', {
        theme: 'snow',
        modules: { 
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'], 
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'header': [1, 2, 3, false] }],
                ['clean']
            ] 
        }
    });
}

// --- કેન્સલ બટન માટેનું ઇવેન્ટ લિસનર ---
document.getElementById("cancel-edit-btn")?.addEventListener("click", () => {
    document.getElementById("add-menu-form").reset();
    document.getElementById("edit-menu-id").value = "";
    if (menuQuill) menuQuill.root.innerHTML = "";
    
    const saveBtn = document.getElementById("save-menu-btn");
    if (saveBtn) saveBtn.innerText = "મેનૂ સેવ કરો";
    
    document.getElementById("cancel-edit-btn").classList.add("hidden");
});

document.getElementById("add-menu-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!lgdCode) {
        alert("⚠️ ભૂલ: પંચાયતનો LGD Code મળ્યો નથી!");
        return;
    }

    const editId = document.getElementById("edit-menu-id").value.trim();
    const title = document.getElementById("menu-title").value.trim();
    const content = menuQuill ? menuQuill.root.innerHTML : "";

    if (!title) {
        alert("⚠️ કૃપા કરીને મેનૂનું નામ ભરો!");
        return;
    }

    try {
        if (editId) {
            await setDoc(getPanchayatDoc("village_details", editId), { 
                title, 
                content, 
                updatedAt: new Date() 
            }, { merge: true });
            alert("✅ મેનૂ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
        } else {
            await addDoc(getPanchayatCol("village_details"), { 
                title, 
                content, 
                isShow: true, 
                createdAt: new Date() 
            });
            alert("✅ નવું મેનૂ સફળતાપૂર્વક સેવ થઈ ગયું!");
        }

        // ફોર્મ રીસેટ કરવું
        document.getElementById("cancel-edit-btn")?.click();
        loadAdminMenuList();
    } catch (err) {
        console.error("Save Menu Error:", err);
        alert("સેવ કરવામાં ટેકનિકલ ભૂલ આવી.");
    }
});

async function loadAdminMenuList() {
    const container = document.getElementById("admin-menu-list");
    if (!container || !lgdCode) return;

    try {
        const snap = await getDocs(getPanchayatCol("village_details"));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = "<p class='text-xs text-gray-500 p-2'>કોઈ મેનૂ મળેલ નથી.</p>";
            return;
        }

        snap.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            const isShow = item.isShow !== false;

            container.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded text-xs mb-1.5 shadow-sm">
                    <span class="font-semibold ${isShow ? 'text-gray-800' : 'text-gray-400 line-through'}">📂 ${item.title}</span>
                    <div class="flex gap-1">
                        <button type="button" onclick="editMenu('${id}')" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-0.5 rounded font-semibold">એડિટ</button>
                        <button type="button" onclick="toggleMenu('${id}', ${isShow})" class="text-white text-[10px] px-2 py-0.5 rounded font-semibold ${isShow ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-500 hover:bg-gray-600'}">${isShow ? 'સંતાડો' : 'બતાવો'}</button>
                        <button type="button" onclick="deleteMenu('${id}')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5 rounded font-semibold">ડિલીટ</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Load Admin Menu List Error:", err);
    }
}

window.editMenu = async (id) => {
    if (!lgdCode) return;
    try {
        const snap = await getDoc(getPanchayatDoc("village_details", id));
        if (snap.exists()) {
            const data = snap.data();
            document.getElementById("edit-menu-id").value = id;
            document.getElementById("menu-title").value = data.title || "";
            if (menuQuill) menuQuill.root.innerHTML = data.content || "";

            const saveBtn = document.getElementById("save-menu-btn");
            if (saveBtn) saveBtn.innerText = "અપડેટ કરો";

            document.getElementById("cancel-edit-btn")?.classList.remove("hidden");
            document.getElementById("add-menu-form")?.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (err) {
        console.error("Edit Menu Error:", err);
    }
};

window.toggleMenu = async (id, currentStatus) => {
    if (!lgdCode) return;
    try {
        await setDoc(getPanchayatDoc("village_details", id), { isShow: !currentStatus }, { merge: true });
        loadAdminMenuList();
    } catch (err) {
        console.error("Toggle Menu Error:", err);
    }
};

window.deleteMenu = async (id) => {
    if (!lgdCode) return;
    if (confirm("શું તમે આ મેનૂ ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(getPanchayatDoc("village_details", id));
            loadAdminMenuList();
        } catch (err) {
            console.error("Delete Menu Error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};
// --- ૧. ફરિયાદ વિભાગ સેટિંગ્સ અને દૈનિક મર્યાદા લોડ અને સેવ કરવી ---
async function loadComplaintConfig() {
    if (!lgdCode) return;
    try {
        const snap = await getDoc(getPanchayatDoc("settings", "complaint_config"));
        if (snap.exists()) {
            const data = snap.data();
            if (document.getElementById("complaint-section-status")) {
                document.getElementById("complaint-section-status").value = data.isEnabled !== false ? "true" : "false";
            }
            if (document.getElementById("complaint-daily-limit")) {
                document.getElementById("complaint-daily-limit").value = data.dailyLimit || 50;
            }
        }
    } catch (err) {
        console.error("Complaint config load error:", err);
    }
}

document.getElementById("save-complaint-config-btn")?.addEventListener("click", async () => {
    if (!lgdCode) return;
    const isEnabled = document.getElementById("complaint-section-status").value === "true";
    const dailyLimitVal = document.getElementById("complaint-daily-limit").value.trim();
    const dailyLimit = dailyLimitVal ? parseInt(dailyLimitVal) : 50;
    
    try {
        await setDoc(getPanchayatDoc("settings", "complaint_config"), { 
            isEnabled, 
            dailyLimit, 
            updatedAt: new Date() 
        }, { merge: true });
        
        alert("✅ સફળતાપૂર્વક સેવ થઈ ગયું!\nવેબસાઇટ પર ફરિયાદ વિભાગનું સ્ટેટસ અને દૈનિક મર્યાદા અપડેટ થઈ ગઈ છે.");
        loadComplaintConfig();
    } catch (err) {
        console.error("Save config error:", err);
        alert("સેવ કરવામાં ભૂલ આવી.");
    }
});

// --- ૨. એડમિન પેનલ માટે ફરિયાદો લોડ કરવી અને ફિલ્ટરિંગ કરવું ---
async function loadAdminComplaints() {
    if (!lgdCode) return;
    const container = document.getElementById("admin-complaint-list");
    const filter = document.getElementById("admin-complaint-filter")?.value || "ALL";
    if (!container) return;

    try {
        const snap = await getDocs(getPanchayatCol("complaints"));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">કોઈ ફરિયાદ મળેલી નથી.</p>`;
            return;
        }

        let count = 0;
        snap.forEach(d => {
            const item = d.data();
            const status = item.status || "Pending";
            
            // ફિલ્ટર લોજિક
            const isPending = status.includes("પેન્ડિંગ") || status.includes("કામ ચાલી");
            const isResolved = status.includes("નિવારણ થઈ ગયું") || status.includes("Resolved");

            if (filter === "PENDING" && !isPending) return;
            if (filter === "RESOLVED" && !isResolved) return;

            count++;
            container.innerHTML += `
                <div class="bg-white p-3 border rounded-xl shadow-sm text-xs space-y-2 mb-2">
                    <div class="flex justify-between font-bold border-b pb-1">
                        <span>ટોકન: <span class="text-emerald-700">${item.token || 'N/A'}</span> | નામ: ${item.name || 'અનામી'} (મો: ${item.mobile || '-'})</span>
                        <span class="bg-blue-50 text-blue-800 px-2 py-0.5 rounded">${item.type || ''}</span>
                    </div>
                    <p><b>વિસ્તાર/ફળિયું:</b> ${item.area || item.faliya || '-'}</p>
                    <p class="text-gray-700"><b>વિગત:</b> ${item.details || item.msg || ''}</p>
                    <div class="flex items-center gap-2 pt-1 border-t">
                        <label class="font-bold text-gray-700">સ્ટેટસ બદલો:</label>
                        <select onchange="updateComplaintStatus('${d.id}', this.value)" class="border border-emerald-300 p-1 rounded bg-amber-50 text-[11px] font-bold flex-1 focus:outline-none">
                            <option value="${status}" selected>હાલનું: ${status}</option>
                            <option value="ફરિયાદ પર કામ ચાલી રહ્યું છે">ફરિયાદ પર કામ ચાલી રહ્યું છે</option>
                            <option value="ફરિયાદ નિવારણ થઈ ગયું છે">ફરિયાદ નિવારણ થઈ ગયું છે</option>
                            <option value="ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે">ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે</option>
                            <option value="ફરિયાદ અયોગ્ય હોય રદ કરવામાં આવેલ છે">ફરિયાદ અયોગ્ય હોય રદ કરવામાં આવેલ છે</option>
                        </select>
                    </div>
                </div>
            `;
        });

        if (count === 0) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">આ ફિલ્ટર મુજબ કોઈ ફરિયાદ નથી.</p>`;
        }
    } catch (err) {
        console.error("Load complaints error:", err);
        container.innerHTML = `<p class="text-xs text-red-500">ફરિયાદો લોડ કરવામાં ભૂલ આવી.</p>`;
    }
}

window.updateComplaintStatus = async (id, status) => {
    if (!lgdCode) return;
    try {
        await updateDoc(getPanchayatDoc("complaints", id), { status, updatedAt: new Date() });
        alert("✅ ફરિયાદનું સ્ટેટસ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
        loadAdminComplaints();
    } catch (err) {
        console.error("Status update error:", err);
        alert("સ્ટેટસ અપડેટ કરવામાં ભૂલ આવી.");
    }
};

// ફિલ્ટર બદલાય ત્યારે લિસ્ટ ઓટોમેટિક અપડેટ થવું
document.getElementById("admin-complaint-filter")?.addEventListener("change", loadAdminComplaints);

// --- ૩. રિપોર્ટ જનરેટર (મહિનાવારી) ---
document.getElementById("download-pdf-btn")?.addEventListener("click", async () => {
    const monthVal = document.getElementById("report-month-select")?.value;
    if (!monthVal) {
        alert("⚠️ કૃપા કરીને પહેલા મહિનો (Month) પસંદ કરો!");
        return;
    }

    try {
        const snap = await getDocs(getPanchayatCol("complaints"));
        let filteredComplaints = [];

        snap.forEach(d => {
            const item = d.data();
            if (item.createdAt && item.createdAt.toDate) {
                const cDate = item.createdAt.toDate();
                const cMonthStr = cDate.toISOString().slice(0, 7); // YYYY-MM
                if (cMonthStr === monthVal) {
                    filteredComplaints.push(item);
                }
            }
        });

        if (filteredComplaints.length === 0) {
            alert("⚠️ પસંદ કરેલ મહિનામાં કોઈ ફરિયાદ મળી નથી.");
            return;
        }

        let printWindow = window.open('', '_blank');
        let htmlContent = `
            <!DOCTYPE html>
            <html lang="gu">
            <head>
                <meta charset="UTF-8">
                <title>ફરિયાદ રિપોર્ટ - ${monthVal}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                    h2 { text-align: center; color: #065f46; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                    th { background-color: #065f46; color: white; }
                </style>
            </head>
            <body>
                <h2>ગ્રામ પંચાયત - ફરિયાદ નિવારણ રિપોર્ટ (${monthVal})</h2>
                <p><b>કુલ ફરિયાદો:</b> ${filteredComplaints.length}</p>
                <table>
                    <thead>
                        <tr>
                            <th>ટોકન નં</th>
                            <th>નામ</th>
                            <th>મોબાઈલ</th>
                            <th>પ્રકાર</th>
                            <th>વિગત</th>
                            <th>સ્ટેટસ</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        filteredComplaints.forEach(c => {
            htmlContent += `
                <tr>
                    <td><b>${c.token || '-'}</b></td>
                    <td>${c.name || '-'}</td>
                    <td>${c.mobile || '-'}</td>
                    <td>${c.type || '-'}</td>
                    <td>${c.details || c.msg || '-'}</td>
                    <td><b>${c.status || 'Pending'}</b></td>
                </tr>
            `;
        });

        htmlContent += `
                    </tbody>
                </table>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } catch (err) {
        console.error("PDF generation error:", err);
        alert("PDF રિપોર્ટ બનાવવામાં ભૂલ આવી.");
    }
});


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
    
    try {
        const snap = await getDocs(getPanchayatCol("panchayat_schedule"));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">કોઈ સમયપત્રક ઉપલબ્ધ નથી.</p>`;
            return;
        }

        snap.forEach(d => {
            const item = d.data();
            container.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2.5 border rounded text-xs mb-1.5 shadow-sm">
                    <div>
                        <b>${item.name || ''}</b> (${item.designation || ''}) - ${item.timing || ''}
                        <div class="text-[11px] text-gray-500">દિવસો: ${item.days || '-'} ${item.note ? `| નોંધ: ${item.note}` : ''}</div>
                    </div>
                    <div class="flex items-center gap-1">
                        <button type="button" onclick="editSchedule('${d.id}', '${encodeURIComponent(item.name || '')}', '${encodeURIComponent(item.designation || '')}', '${encodeURIComponent(item.timing || '')}', '${encodeURIComponent(item.days || '')}', '${encodeURIComponent(item.note || '')}')" class="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-1 rounded font-bold shadow">
                            એડિટ
                        </button>
                        <button type="button" onclick="deleteSchedule('${d.id}')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded font-bold shadow">
                            ડિલીટ
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Load Schedule Error:", err);
    }
}

window.deleteSchedule = async (id) => {
    if (confirm("શું તમે આ સમય પત્રક ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(getPanchayatDoc("panchayat_schedule", id));
            alert("સમય પત્રક ડિલીટ થઈ ગયું!");
            loadAdminSchedule();
        } catch (err) {
            console.error("Delete Error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

window.editSchedule = (id, name, desig, timing, days, note) => {
    document.getElementById("sch-name").value = decodeURIComponent(name);
    document.getElementById("sch-desig").value = decodeURIComponent(desig);
    document.getElementById("sch-timing").value = decodeURIComponent(timing);
    document.getElementById("sch-days").value = decodeURIComponent(days);
    
    const noteEl = document.getElementById("sch-note");
    if (noteEl) noteEl.value = decodeURIComponent(note);

    let editIdInput = document.getElementById("sch-edit-id");
    if (!editIdInput) {
        editIdInput = document.createElement("input");
        editIdInput.type = "hidden";
        editIdInput.id = "sch-edit-id";
        document.getElementById("add-schedule-form").appendChild(editIdInput);
    }
    editIdInput.value = id;

    const submitBtn = document.querySelector("#add-schedule-form button[type='submit']");
    if (submitBtn) {
        submitBtn.innerText = "અપડેટ કરો";
        submitBtn.classList.remove("bg-emerald-600", "hover:bg-emerald-700");
        submitBtn.classList.add("bg-amber-600", "hover:bg-amber-700");
    }

    document.getElementById("add-schedule-form")?.scrollIntoView({ behavior: 'smooth' });
};

document.getElementById("add-schedule-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const editIdInput = document.getElementById("sch-edit-id");
    const editId = editIdInput ? editIdInput.value : "";

    const payload = {
        name: document.getElementById("sch-name").value.trim(),
        designation: document.getElementById("sch-desig").value.trim(),
        timing: document.getElementById("sch-timing").value.trim(),
        days: document.getElementById("sch-days").value.trim(),
        note: document.getElementById("sch-note")?.value.trim() || ''
    };

    try {
        if (editId) {
            payload.updatedAt = new Date();
            await updateDoc(getPanchayatDoc("panchayat_schedule", editId), payload);
            alert("સમય પત્રક સફળતાપૂર્વક અપડેટ થઈ ગયું!");
            
            editIdInput.value = "";
            const submitBtn = document.querySelector("#add-schedule-form button[type='submit']");
            if (submitBtn) {
                submitBtn.innerText = "સમય પત્રક ઉમેરો";
                submitBtn.classList.remove("bg-amber-600", "hover:bg-amber-700");
                submitBtn.classList.add("bg-emerald-600", "hover:bg-emerald-700");
            }
        } else {
            payload.createdAt = new Date();
            await addDoc(getPanchayatCol("panchayat_schedule"), payload);
            alert("સમય પત્રક ઉમેરાઈ ગયું!");
        }

        e.target.reset();
        loadAdminSchedule();
    } catch (err) {
        console.error("Save/Update Schedule Error:", err);
        alert("સેવ કરવામાં ભૂલ આવી.");
    }
});

// --- ૯. કાર્યરત સમિતિઓ મેનેજર & લોડિંગ ફંક્શન ---
// --- ૧. સમિતિમાં નવું સભ્ય રો (Row) ઉમેરવા માટેનું બટન ---
document.getElementById("add-member-row-btn")?.addEventListener("click", () => {
    const container = document.getElementById("committee-members-container");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "member-row flex items-center gap-2 border p-2 rounded bg-gray-50";
    row.innerHTML = `
        <input type="text" placeholder="સભ્યનું નામ" class="member-name w-1/3 border p-1.5 rounded text-xs" required>
        <input type="text" placeholder="મૂળ હોદ્દો" class="member-main-role w-1/3 border p-1.5 rounded text-xs" required>
        <input type="text" placeholder="સમિતિ હોદ્દો" class="member-comm-role w-1/3 border p-1.5 rounded text-xs" required>
        <button type="button" class="remove-member-btn text-red-500 hover:text-red-700 font-bold px-1 text-sm">&times;</button>
    `;
    container.appendChild(row);
});

// --- ૨. સભ્ય રો ડિલીટ કરવા માટેનું ઇવેન્ટ ડેલિગેશન ---
document.getElementById("committee-members-container")?.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-member-btn")) {
        const rows = document.querySelectorAll(".member-row");
        if (rows.length > 1) {
            e.target.closest(".member-row").remove();
        } else {
            alert("⚠️ ઓછામાં ઓછું એક સભ્ય હોવું જરૂરી છે!");
        }
    }
});

// --- ૩. કાર્યરત સમિતિઓ લોડ કરવા માટેનું ફંક્શન ---
async function loadActiveCommittees() {
    const container = document.getElementById("admin-committees-list");
    if (!container || !lgdCode) return;

    try {
        const snap = await getDocs(getPanchayatCol("active_committees"));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">કોઈ કાર્યરત સમિતિ ઉપલબ્ધ નથી.</p>`;
            return;
        }

        snap.forEach(d => {
            const item = d.data();
            const membersList = item.members ? item.members.map(m => `<br>&nbsp;&nbsp;• ${m.name} (${m.commRole || m.comm_role || '-'})`).join('') : '';
            
            container.innerHTML += `
                <div class="bg-white border p-3 rounded-xl shadow-sm text-xs space-y-1.5 mb-2">
                    <div class="flex justify-between items-center font-bold border-b pb-1">
                        <span class="text-purple-950 text-sm">${item.committeeName || item.cgTitle || 'સમિતિ'} (${item.members ? item.members.length : 0} સભ્યો)</span>
                        <div class="flex items-center gap-1">
                            <button type="button" onclick="editActiveComm('${d.id}')" class="bg-amber-500 hover:bg-amber-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow">
                                એડિટ
                            </button>
                            <button type="button" onclick="deleteActiveComm('${d.id}')" class="bg-red-600 hover:bg-red-700 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow">
                                ડિલીટ
                            </button>
                        </div>
                    </div>
                    <div class="text-gray-600 text-[11px]"><b>સભ્યો:</b> ${membersList || 'કોઈ સભ્ય નથી'}</div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Load Active Committees Error:", err);
    }
}

// --- ૪. સમિતિ ડિલીટ કરવા માટેનું ફંક્શન ---
window.deleteActiveComm = async (id) => {
    if (confirm("શું તમે આ સમિતિ ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(getPanchayatDoc("active_committees", id));
            alert("સમિતિ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!");
            loadActiveCommittees();
        } catch (err) {
            console.error("Delete Error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

// --- ૫. સમિતિ એડિટ કરવા માટે ફોર્મમાં ડેટા લોડ કરવો ---
window.editActiveComm = async (id) => {
    try {
        const docSnap = await getDoc(getPanchayatDoc("active_committees", id));
        if (!docSnap.exists()) return;

        const data = docSnap.data();
        
        // શીર્ષક સેટ કરવું
        const titleInput = document.getElementById("cg-title");
        if (titleInput) titleInput.value = data.committeeName || data.cgTitle || "";

        // એડિટ ID સેટ કરવી
        const editIdInput = document.getElementById("edit-committee-id");
        if (editIdInput) editIdInput.value = id;

        // સભ્યોની યાદી લોડ કરવી
        const container = document.getElementById("committee-members-container");
        if (container && data.members && data.members.length > 0) {
            container.innerHTML = "";
            data.members.forEach(m => {
                const row = document.createElement("div");
                row.className = "member-row flex items-center gap-2 border p-2 rounded bg-gray-50";
                row.innerHTML = `
                    <input type="text" placeholder="સભ્યનું નામ" value="${m.name || ''}" class="member-name w-1/3 border p-1.5 rounded text-xs" required>
                    <input type="text" placeholder="મૂળ હોદ્દો" value="${m.mainRole || m.main_role || ''}" class="member-main-role w-1/3 border p-1.5 rounded text-xs" required>
                    <input type="text" placeholder="સમિતિ હોદ્દો" value="${m.commRole || m.comm_role || ''}" class="member-comm-role w-1/3 border p-1.5 rounded text-xs" required>
                    <button type="button" class="remove-member-btn text-red-500 hover:text-red-700 font-bold px-1 text-sm">&times;</button>
                `;
                container.appendChild(row);
            });
        }

        // બટનના નામ બદલવા અને કેન્સલ બટન બતાવવું
        const submitBtn = document.getElementById("submit-comm-btn");
        if (submitBtn) submitBtn.innerText = "અપડેટ કરો";

        const cancelBtn = document.getElementById("cancel-comm-edit-btn");
        if (cancelBtn) cancelBtn.classList.remove("hidden");

        document.getElementById("add-committee-group-form")?.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error("Edit Load Error:", err);
    }
};

// --- ૬. કેન્સલ બટન માટેનું લોજિક ---
document.getElementById("cancel-comm-edit-btn")?.addEventListener("click", () => {
    const form = document.getElementById("add-committee-group-form");
    if (form) form.reset();

    const editIdInput = document.getElementById("edit-committee-id");
    if (editIdInput) editIdInput.value = "";

    const container = document.getElementById("committee-members-container");
    if (container) {
        container.innerHTML = `
            <div class="member-row flex items-center gap-2 border p-2 rounded bg-gray-50">
                <input type="text" placeholder="સભ્યનું નામ" class="member-name w-1/3 border p-1.5 rounded text-xs" required>
                <input type="text" placeholder="મૂળ હોદ્દો" class="member-main-role w-1/3 border p-1.5 rounded text-xs" required>
                <input type="text" placeholder="સમિતિ હોદ્દો" class="member-comm-role w-1/3 border p-1.5 rounded text-xs" required>
                <button type="button" class="remove-member-btn text-red-500 hover:text-red-700 font-bold px-1 text-sm">&times;</button>
            </div>
        `;
    }

    const submitBtn = document.getElementById("submit-comm-btn");
    if (submitBtn) submitBtn.innerText = "સમિતિ સાચવો";

    const cancelBtn = document.getElementById("cancel-comm-edit-btn");
    if (cancelBtn) cancelBtn.classList.add("hidden");
});

// --- ૭. સમિતિ સેવ અથવા અપડેટ કરવા માટેનું ફોર્મ સબમિટ હેન્ડલર (પરફેક્ટ ફિક્સ) ---
document.getElementById("add-committee-group-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🛑 પેજ રિફ્રેશ થતું અટકાવશે

    if (!lgdCode) {
        alert("⚠️ ભૂલ: LGD Code મળ્યો નથી!");
        return;
    }

    const editId = document.getElementById("edit-committee-id")?.value.trim();
    const committeeName = document.getElementById("cg-title")?.value.trim();

    if (!committeeName) {
        alert("⚠️ કૃપા કરીને સમિતિનું નામ ભરો!");
        return;
    }

    // બધા સભ્યોના ડેટા એરે (Array) માં ભેગા કરવા
    const memberRows = document.querySelectorAll(".member-row");
    const members = [];

    memberRows.forEach(row => {
        const name = row.querySelector(".member-name")?.value.trim();
        const mainRole = row.querySelector(".member-main-role")?.value.trim();
        const commRole = row.querySelector(".member-comm-role")?.value.trim();

        if (name) {
            members.push({ name, mainRole, commRole });
        }
    });

    if (members.length === 0) {
        alert("⚠️ કૃપા કરીને ઓછામાં ઓછા એક સભ્યની વિગત ભરો!");
        return;
    }

    const payload = {
        committeeName: committeeName,
        cgTitle: committeeName,
        members: members,
        updatedAt: new Date()
    };

    try {
        if (editId) {
            // અપડેટ કરવું
            await updateDoc(getPanchayatDoc("active_committees", editId), payload);
            alert("✅ સમિતિ સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
        } else {
            // નવી ઉમેરવી
            payload.createdAt = new Date();
            await addDoc(getPanchayatCol("active_committees"), payload);
            alert("✅ નવી સમિતિ સફળતાપૂર્વક ઉમેરાઈ ગઈ!");
        }

        // ફોર્મ રિસેટ કરવું અને UI મૂળ સ્થિતિમાં લાવવું
        document.getElementById("cancel-comm-edit-btn")?.click();
        loadActiveCommittees(); // લિસ્ટ રિફ્રેશ કરવું

    } catch (err) {
        console.error("Save/Update Committee Error:", err);
        alert("સેવ કરવામાં ટેકનિકલ ભૂલ આવી: " + err.message);
    }
});

// --- ૧૦. મિલકત વેરા લિંક લોડ અને સેવ કરવી ---
async function loadAdminTaxLink() {
    if (!lgdCode) return;
    try {
        const snap = await getDoc(getPanchayatDoc("settings", "tax_payment"));
        if (snap.exists()) {
            const data = snap.data();
            const taxInput = document.getElementById("tax-payment-url");
            if (taxInput) {
                taxInput.value = data.url || "";
            }
        }
    } catch (err) {
        console.error("Tax link load error:", err);
    }
}

document.getElementById("tax-link-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); // પેજ રિફ્રેશ થતું અટકાવવા માટે

    if (!lgdCode) {
        alert("⚠️ ભૂલ: પંચાયતનો LGD Code મળ્યો નથી!");
        return;
    }

    const taxInput = document.getElementById("tax-payment-url");
    const url = taxInput ? taxInput.value.trim() : "";

    try {
        await setDoc(getPanchayatDoc("settings", "tax_payment"), { 
            url: url, 
            updatedAt: new Date() 
        }, { merge: true });
        
        alert("✅ મિલકત વેરા લિંક સફળતાપૂર્વક સાચવવામાં આવી!");
        loadAdminTaxLink();
    } catch (err) {
        console.error("Save tax link error:", err);
        alert("લિંક સેવ કરવામાં ટેકનિકલ ભૂલ આવી.");
    }
});

// --- ૧૧. કસ્ટમ બટન અને પેજ મેનેજર ---
async function loadAdminCustomButtons() {
    const container = document.getElementById("admin-custom-buttons-list");
    if (!container || !lgdCode) return;

    try {
        const snap = await getDocs(getPanchayatCol("custom_pages"));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-400 p-2">કોઈ કસ્ટમ બટન ઉપલબ્ધ નથી.</p>`;
            return;
        }

        snap.forEach(d => {
            const item = d.data();
            container.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded text-xs mb-1 shadow-sm">
                    <span class="font-bold text-gray-800">📌 ${item.buttonTitle || 'બટન'}</span>
                    <div class="flex gap-1">
                        <button type="button" onclick="editCustomBtn('${d.id}', '${encodeURIComponent(item.buttonTitle || '')}', '${encodeURIComponent(item.htmlContent || '')}')" class="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded font-semibold">એડિટ</button>
                        <button type="button" onclick="deleteCustomBtn('${d.id}')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5 rounded font-semibold">ડિલીટ</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Load Custom Buttons Error:", err);
    }
}

window.deleteCustomBtn = async (id) => {
    if (confirm("શું તમે આ કસ્ટમ બટન ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(getPanchayatDoc("custom_pages", id));
            alert("કસ્ટમ બટન સફળતાપૂર્વક ડિલીટ થઈ ગયું!");
            loadAdminCustomButtons();
        } catch (err) {
            console.error("Delete Custom Button Error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

window.editCustomBtn = (id, titleEncoded, htmlEncoded) => {
    const titleInput = document.getElementById("custom-btn-title");
    const htmlInput = document.getElementById("custom-page-html");
    const editIdInput = document.getElementById("edit-custom-page-id");
    const submitBtn = document.getElementById("custom-page-submit-btn");
    const cancelBtn = document.getElementById("custom-page-cancel-btn");

    if (titleInput) titleInput.value = decodeURIComponent(titleEncoded);
    if (htmlInput) htmlInput.value = decodeURIComponent(htmlEncoded);
    if (editIdInput) editIdInput.value = id;

    if (submitBtn) submitBtn.innerText = "અપડેટ કરો";
    if (cancelBtn) cancelBtn.classList.remove("hidden");

    document.getElementById("add-page-button-form")?.scrollIntoView({ behavior: 'smooth' });
};

document.getElementById("custom-page-cancel-btn")?.addEventListener("click", () => {
    const form = document.getElementById("add-page-button-form");
    if (form) form.reset();

    const editIdInput = document.getElementById("edit-custom-page-id");
    if (editIdInput) editIdInput.value = "";

    const submitBtn = document.getElementById("custom-page-submit-btn");
    if (submitBtn) submitBtn.innerText = "ઉમેરો";

    const cancelBtn = document.getElementById("custom-page-cancel-btn");
    if (cancelBtn) cancelBtn.classList.add("hidden");
});

document.getElementById("add-page-button-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); // પેજ રિફ્રેશ અટકાવવા માટે

    if (!lgdCode) {
        alert("⚠️ ભૂલ: LGD Code મળ્યો નથી!");
        return;
    }

    const editIdInput = document.getElementById("edit-custom-page-id");
    const editId = editIdInput ? editIdInput.value.trim() : "";

    const buttonTitle = document.getElementById("custom-btn-title")?.value.trim();
    const htmlContent = document.getElementById("custom-page-html")?.value.trim();

    if (!buttonTitle || !htmlContent) {
        alert("⚠️ કૃપા કરીને બટનનું નામ અને HTML કન્ટેન્ટ બંને ભરો!");
        return;
    }

    const payload = {
        buttonTitle: buttonTitle,
        htmlContent: htmlContent,
        updatedAt: new Date()
    };

    try {
        if (editId) {
            await updateDoc(getPanchayatDoc("custom_pages", editId), payload);
            alert("✅ કસ્ટમ બટન સફળતાપૂર્વક અપડેટ થઈ ગયું!");
        } else {
            payload.createdAt = new Date();
            await addDoc(getPanchayatCol("custom_pages"), payload);
            alert("✅ નવું કસ્ટમ બટન સફળતાપૂર્વક ઉમેરાઈ ગયું!");
        }

        document.getElementById("custom-page-cancel-btn")?.click();
        loadAdminCustomButtons();
    } catch (err) {
        console.error("Save Custom Button Error:", err);
        alert("સેવ કરવામાં ટેકનિકલ ભૂલ આવી: " + err.message);
    }
});

// --- ૧૨. ઇવેન્ટ્સ મેનેજર ---
// --- ૧૨. ઇવેન્ટ્સ મેનેજર ---
async function loadAdminEvents() {
    const container = document.getElementById("admin-events-list");
    if (!container || !lgdCode) return;

    try {
        const snap = await getDocs(getPanchayatCol("events"));
        container.innerHTML = "";
        
        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-400 p-2">કોઈ ઇવેન્ટ ઉપલબ્ધ નથી.</p>`;
            return;
        }

        snap.forEach(d => {
            const item = d.data();
            container.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded text-xs mb-1 shadow-sm">
                    <div>
                        <span class="font-bold text-gray-800">📅 ${item.eventName || 'ઇવેન્ટ'}</span>
                        <p class="text-[10px] text-gray-500">તારીખ: ${item.eventDate || '-'} | સ્થળ: ${item.eventLocation || '-'}</p>
                    </div>
                    <div class="flex gap-1">
                        <button type="button" onclick="editEvent('${d.id}', '${encodeURIComponent(item.eventName || '')}', '${item.eventDate || ''}', '${encodeURIComponent(item.eventLocation || '')}')" class="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded font-semibold">એડિટ</button>
                        <button type="button" onclick="deleteEvent('${d.id}')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5 rounded font-semibold">ડિલીટ</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Load Admin Events Error:", err);
    }
}

window.deleteEvent = async (id) => {
    if (confirm("શું તમે આ ઇવેન્ટ ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(getPanchayatDoc("events", id));
            alert("ઇવેન્ટ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!");
            loadAdminEvents();
        } catch (err) {
            console.error("Delete Event Error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

window.editEvent = (id, nameEnc, date, locEnc) => {
    const editIdInput = document.getElementById("edit-event-id");
    const nameInput = document.getElementById("event-name");
    const dateInput = document.getElementById("event-date");
    const locInput = document.getElementById("event-location");
    const submitBtn = document.getElementById("event-submit-btn");
    const cancelBtn = document.getElementById("event-cancel-btn");

    if (editIdInput) editIdInput.value = id;
    if (nameInput) nameInput.value = decodeURIComponent(nameEnc);
    if (dateInput) dateInput.value = date;
    if (locInput) locInput.value = decodeURIComponent(locEnc);

    if (submitBtn) submitBtn.innerText = "અપડેટ કરો";
    if (cancelBtn) cancelBtn.classList.remove("hidden");

    document.getElementById("event-form")?.scrollIntoView({ behavior: 'smooth' });
};

document.getElementById("event-cancel-btn")?.addEventListener("click", () => {
    const form = document.getElementById("event-form");
    if (form) form.reset();

    const editIdInput = document.getElementById("edit-event-id");
    if (editIdInput) editIdInput.value = "";

    const submitBtn = document.getElementById("event-submit-btn");
    if (submitBtn) submitBtn.innerText = "ઇવેન્ટ ઉમેરો";

    const cancelBtn = document.getElementById("event-cancel-btn");
    if (cancelBtn) cancelBtn.classList.add("hidden");
});

document.getElementById("event-form")?.addEventListener("submit", async (e) => {
    e.preventDefault(); // પેજ રિફ્રેશ થતું અટકાવવા માટે

    if (!lgdCode) {
        alert("⚠️ ભૂલ: LGD Code મળ્યો નથી!");
        return;
    }

    const editIdInput = document.getElementById("edit-event-id");
    const editId = editIdInput ? editIdInput.value.trim() : "";

    const eventName = document.getElementById("event-name")?.value.trim();
    const eventDate = document.getElementById("event-date")?.value;
    const eventLocation = document.getElementById("event-location")?.value.trim();

    if (!eventName || !eventDate || !eventLocation) {
        alert("⚠️ કૃપા કરીને તમામ વિગતો ભરો!");
        return;
    }

    const payload = {
        eventName: eventName,
        eventDate: eventDate,
        eventLocation: eventLocation,
        updatedAt: new Date()
    };

    try {
        if (editId) {
            await updateDoc(getPanchayatDoc("events", editId), payload);
            alert("✅ ઇવેન્ટ સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
        } else {
            payload.createdAt = new Date();
            await addDoc(getPanchayatCol("events"), payload);
            alert("✅ નવી ઇવેન્ટ સફળતાપૂર્વક ઉમેરાઈ ગઈ!");
        }

        document.getElementById("event-cancel-btn")?.click();
        loadAdminEvents();
    } catch (err) {
        console.error("Save/Update Event Error:", err);
        alert("સેવ કરવામાં ટેકનિકલ ભૂલ આવી: " + err.message);
    }
});
// --- ૧૨. ઇવેન્ટ્સ મેનેજર ( કોડ પૂર્ણ)---

// --- ૧૩. આપત્તિ વ્યવસ્થાપન મેનેજર ---
async function fetchDisasterContent() {
    const keySelect = document.getElementById('disaster-page-key');
    if (!keySelect || !lgdCode) return; // જો એલિમેન્ટ ન હોય તો આગળ ન વધવું
    
    const standardBox = document.getElementById('standard-disaster-box');
    const galleryBox = document.getElementById('gallery-disaster-box');
    const key = keySelect.value;

    if (key === 'disaster_gallery') {
        if (standardBox) standardBox.classList.add('hidden');
        if (galleryBox) galleryBox.classList.remove('hidden');
        loadAdminDisasterGallery();
    } else {
        if (standardBox) standardBox.classList.remove('hidden');
        if (galleryBox) galleryBox.classList.add('hidden');

        const contentTextarea = document.getElementById('disaster-page-content');
        if (!contentTextarea) return;

        let defaultTemplate = "";
        if (key === 'important_contacts') {
            defaultTemplate = `<div class="space-y-2">\n  <p><b>પંચાયત સચિવ:</b> 9876543210</p>\n  <p><b>સરપંચશ્રી:</b> 9123456789</p>\n</div>`;
        } else if (key === 'vdrmp') {
            defaultTemplate = `<h3 class="font-bold text-base text-blue-800">ગામ આપત્તિ વ્યવસ્થાપન યોજના</h3>\n<p>અહીં ગામની આપત્તિ વ્યવસ્થાપન યોજનાની વિગતો લખો...</p>`;
        } else if (key === 'mock_drills') {
            defaultTemplate = `<h3 class="font-bold text-base text-blue-800">મોક ડ્રિલ અહેવાલ</h3>\n<p>અહીં મોક ડ્રિલ વિશે માહિતી લખો...</p>`;
        }

        try {
            const snap = await getDoc(getPanchayatDoc("disaster_management", key));
            if (snap.exists()) {
                const data = snap.data();
                contentTextarea.value = data.content || defaultTemplate;
            } else {
                contentTextarea.value = defaultTemplate;
            }
        } catch (err) {
            console.error("Fetch Disaster Content Error:", err);
            contentTextarea.value = defaultTemplate;
        }
    }
}

document.getElementById('disaster-page-key')?.addEventListener('change', fetchDisasterContent);

document.getElementById('disaster-management-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!lgdCode) return;

    const key = document.getElementById('disaster-page-key').value;
    const contentTextarea = document.getElementById('disaster-page-content');
    if (!contentTextarea) return;

    const content = contentTextarea.value.trim();

    try {
        await setDoc(getPanchayatDoc("disaster_management", key), { 
            content: content, 
            updatedAt: new Date() 
        }, { merge: true });
        
        alert("✅ આપત્તિ વ્યવસ્થાપન પેજ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
    } catch (err) {
        console.error("Save Disaster Content Error:", err);
        alert("સેવ કરવામાં ટેકનિકલ ભૂલ આવી.");
    }
});

// --- આપત્તિ ગેલેરી (Disaster Gallery) માટેના ફંક્શન્સ ---
async function loadAdminDisasterGallery() {
    const container = document.getElementById("admin-disaster-gallery-list");
    if (!container || !lgdCode) return;

    try {
        const snap = await getDocs(collection(db, "panchayats", lgdCode, "disaster_gallery"));
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-400 p-2">હાલમાં કોઈ ફોટા ઉમેરેલા નથી.</p>`;
            return;
        }

        snap.forEach(d => {
            const item = d.data();
            container.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs mb-1 shadow-sm">
                    <div class="flex items-center gap-2">
                        <img src="${item.imageUrl}" class="w-8 h-8 object-cover rounded border" onerror="this.src='https://via.placeholder.com/40'">
                        <span class="font-bold text-gray-800 line-clamp-1">${item.title || 'ફોટો'}</span>
                    </div>
                    <div class="flex gap-1">
                        <button type="button" onclick="editDisasterGallery('${d.id}', '${encodeURIComponent(item.title || '')}', '${encodeURIComponent(item.imageUrl || '')}')" class="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded font-semibold">એડિટ</button>
                        <button type="button" onclick="deleteDisasterGallery('${d.id}')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-0.5 rounded font-semibold">ડિલીટ</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Load Disaster Gallery Error:", err);
    }
}

window.editDisasterGallery = (id, titleEnc, urlEnc) => {
    const editIdInput = document.getElementById("edit-gallery-id");
    const titleInput = document.getElementById("gallery-title");
    const urlInput = document.getElementById("gallery-img-url");
    const submitBtn = document.getElementById("gallery-submit-btn");
    const cancelBtn = document.getElementById("gallery-cancel-btn");

    if (editIdInput) editIdInput.value = id;
    if (titleInput) titleInput.value = decodeURIComponent(titleEnc);
    if (urlInput) urlInput.value = decodeURIComponent(urlEnc);

    if (submitBtn) submitBtn.innerText = "અપડેટ કરો";
    if (cancelBtn) cancelBtn.classList.remove("hidden");
};

document.getElementById("gallery-cancel-btn")?.addEventListener("click", () => {
    const form = document.getElementById("disaster-gallery-form");
    if (form) form.reset();

    const editIdInput = document.getElementById("edit-gallery-id");
    if (editIdInput) editIdInput.value = "";

    const submitBtn = document.getElementById("gallery-submit-btn");
    if (submitBtn) submitBtn.innerText = "ફોટો ઉમેરો";

    const cancelBtn = document.getElementById("gallery-cancel-btn");
    if (cancelBtn) cancelBtn.classList.add("hidden");
});

document.getElementById("disaster-gallery-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!lgdCode) return;

    const editIdInput = document.getElementById("edit-gallery-id");
    const titleInput = document.getElementById("gallery-title");
    const urlInput = document.getElementById("gallery-img-url");

    if (!editIdInput || !titleInput || !urlInput) return;

    const editId = editIdInput.value.trim();
    const title = titleInput.value.trim();
    const imageUrl = urlInput.value.trim();

    if (!title || !imageUrl) {
        alert("⚠️ કૃપા કરીને શીર્ષક અને ઇમેજ લિંક બંને ભરો!");
        return;
    }

    try {
        const galleryColRef = collection(db, "panchayats", lgdCode, "disaster_gallery");
        
        if (!editId) {
            const currentSnap = await getDocs(galleryColRef);
            if (currentSnap.size >= 20) {
                alert("⚠️ તમે મેક્સિમમ ૨૦ ફોટા જ ઉમેરી શકો છો!");
                return;
            }
        }

        const payload = {
            title: title,
            imageUrl: imageUrl,
            updatedAt: new Date()
        };

        if (editId) {
            await updateDoc(doc(db, "panchayats", lgdCode, "disaster_gallery", editId), payload);
            alert("✅ ફોટો સફળતાપૂર્વક અપડેટ થઈ ગયો!");
        } else {
            payload.createdAt = new Date();
            await addDoc(galleryColRef, payload);
            alert("✅ નવો ફોટો સફળતાપૂર્વક ઉમેરાઈ ગયો!");
        }

        document.getElementById("gallery-cancel-btn")?.click();
        loadAdminDisasterGallery();
    } catch (err) {
        console.error("Save Gallery Error:", err);
        alert("સેવ કરવામાં ટેકનિકલ ભૂલ આવી.");
    }
});

window.deleteDisasterGallery = async (id) => {
    if (!lgdCode) return;
    if (confirm("શું તમે આ ફોટો ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(doc(db, "panchayats", lgdCode, "disaster_gallery", id));
            alert("ફોટો સફળતાપૂર્વક ડિલીટ થઈ ગયો!");
            loadAdminDisasterGallery();
        } catch (err) {
            console.error("Delete Gallery Error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

// --- ૧૪. સેટેલાઇટ & રેવન્યુ મેપ લિંક્સ ---

async function fetchExistingMapLinks() {
    if (!lgdCode) return;
    try {
        const snap = await getDoc(getPanchayatDoc("village_map_settings", "links"));
        if (snap.exists()) {
            if (document.getElementById('admin-satellite-url')) document.getElementById('admin-satellite-url').value = snap.data().satelliteUrl || "";
            if (document.getElementById('admin-revenue-pdf-url')) document.getElementById('admin-revenue-pdf-url').value = snap.data().revenuePdfUrl || "";
        }
    } catch (err) {
        console.error("Map links fetch error:", err);
    }
}

document.getElementById('village-map-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!lgdCode) return;

    const satelliteUrl = document.getElementById('admin-satellite-url').value.trim();
    const revenuePdfUrl = document.getElementById('admin-revenue-pdf-url').value.trim();
    
    try {
        await setDoc(getPanchayatDoc("village_map_settings", "links"), { 
            satelliteUrl, 
            revenuePdfUrl, 
            updatedAt: new Date() 
        }, { merge: true });
        
        alert("✅ નક્શાની લિંક્સ સફળતાપૂર્વક સાચવાઈ ગઈ!");
    } catch (err) {
        console.error("Map links save error:", err);
        alert("લિંક સેવ કરવામાં ભૂલ આવી.");
    }
});
// --- સેટેલાઇટ & રેવન્યુ મેપ લિંક્સ (પૂર્ણ) ---

// --- ૧૫. મારૂ ગામ - એક નજરમાં (Glance Manager) ---
let glanceCache = {};

async function loadAdminGlanceList() {
    const container = document.getElementById("admin-glance-list");
    if (!container || !lgdCode) return;

    try {
        const snap = await getDocs(getPanchayatCol("village_glance"));
        container.innerHTML = "";
        glanceCache = {};

        if (snap.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">હાલમાં કોઈ માહિતી ઉમેરેલી નથી.</p>`;
            return;
        }

        snap.forEach(d => {
            const item = d.data();
            const id = d.id;
            glanceCache[id] = item;

            container.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-2.5 border rounded text-xs mb-1.5 shadow-sm">
                    <div>
                        <span class="font-bold text-emerald-800">[${item.sectionName || 'અન્ય'}]</span> 
                        <span><b>${item.title}:</b> ${item.value}</span>
                        ${item.extraInfo ? `<p class="text-[10px] text-gray-500">વધારાની માહિતી: ${item.extraInfo}</p>` : ''}
                    </div>
                    <div class="flex gap-1">
                        <button type="button" onclick="editGlance('${id}')" class="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded font-semibold">એડિટ</button>
                        <button type="button" onclick="deleteGlance('${id}')" class="bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded font-semibold">ડિલીટ</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error("Load Glance Error:", err);
    }
}

window.editGlance = (id) => {
    const item = glanceCache[id];
    if (!item) return;

    document.getElementById("edit-glance-id").value = id;
    document.getElementById("glance-section").value = item.sectionName || "";
    document.getElementById("glance-title").value = item.title || "";
    document.getElementById("glance-value").value = item.value || "";
    document.getElementById("glance-extra").value = item.extraInfo || "";

    const submitBtn = document.getElementById("submit-glance-btn");
    if (submitBtn) submitBtn.innerText = "અપડેટ કરો";

    const cancelBtn = document.getElementById("cancel-glance-edit-btn");
    if (cancelBtn) cancelBtn.classList.remove("hidden");

    document.getElementById("add-glance-form")?.scrollIntoView({ behavior: 'smooth' });
};

document.getElementById("cancel-glance-edit-btn")?.addEventListener("click", () => {
    document.getElementById("add-glance-form").reset();
    document.getElementById("edit-glance-id").value = "";
    
    const submitBtn = document.getElementById("submit-glance-btn");
    if (submitBtn) submitBtn.innerText = "માહિતી સાચવો";

    const cancelBtn = document.getElementById("cancel-glance-edit-btn");
    if (cancelBtn) cancelBtn.classList.add("hidden");
});

window.deleteGlance = async (id) => {
    if (!lgdCode) return;
    if (confirm("શું તમે આ માહિતી ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(getPanchayatDoc("village_glance", id));
            alert("માહિતી સફળતાપૂર્વક ડિલીટ થઈ ગઈ!");
            loadAdminGlanceList();
        } catch (err) {
            console.error("Delete Glance Error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

document.getElementById("add-glance-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!lgdCode) {
        alert("⚠️ LGD Code મળ્યો નથી!");
        return;
    }

    const editId = document.getElementById("edit-glance-id").value.trim();
    const payload = {
        sectionName: document.getElementById("glance-section").value.trim(),
        title: document.getElementById("glance-title").value.trim(),
        value: document.getElementById("glance-value").value.trim(),
        extraInfo: document.getElementById("glance-extra").value.trim(),
        updatedAt: new Date()
    };

    try {
        if (editId) {
            await updateDoc(getPanchayatDoc("village_glance", editId), payload);
            alert("✅ માહિતી સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
        } else {
            payload.createdAt = new Date();
            await addDoc(getPanchayatCol("village_glance"), payload);
            alert("✅ નવી માહિતી સફળતાપૂર્વક ઉમેરાઈ ગઈ!");
        }

        document.getElementById("cancel-glance-edit-btn")?.click();
        loadAdminGlanceList();
    } catch (err) {
        console.error("Save Glance Error:", err);
        alert("સેવ કરવામાં ટેકનિકલ ભૂલ આવી: " + err.message);
    }
});
// --- ૧૫. મારૂ ગામ - એક નજરમાં (Glance Manager કોડ પૂર્ણ) ---

// --- ૧૬. સંપર્ક પેજ વિગતો મેનેજ કરો ---
async function loadContactAdminData() {
    if (!lgdCode) return;
    try {
        const snap = await getDoc(getPanchayatDoc("settings", "contact_info"));
        if (snap.exists()) {
            const data = snap.data();
            if (document.getElementById("adm-panchayat-name")) document.getElementById("adm-panchayat-name").value = data.panchayatName || "";
            if (document.getElementById("adm-address")) document.getElementById("adm-address").value = data.address || "";
            if (document.getElementById("adm-email")) document.getElementById("adm-email").value = data.email || "";
            if (document.getElementById("adm-phone")) document.getElementById("adm-phone").value = data.phone || "";
            if (document.getElementById("adm-extra")) document.getElementById("adm-extra").value = data.extraInfo || "";
        }
    } catch (err) {
        console.error("Load Contact Admin Error:", err);
    }
}

document.getElementById("contact-admin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!lgdCode) return;

    const payload = {
        panchayatName: document.getElementById("adm-panchayat-name").value.trim(),
        address: document.getElementById("adm-address").value.trim(),
        email: document.getElementById("adm-email").value.trim(),
        phone: document.getElementById("adm-phone").value.trim(),
        extraInfo: document.getElementById("adm-extra").value.trim(),
        updatedAt: new Date()
    };

    try {
        await setDoc(getPanchayatDoc("settings", "contact_info"), payload, { merge: true });
        alert("✅ સંપર્ક વિગતો સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
    } catch (err) {
        console.error("Save Contact Error:", err);
        alert("સંપર્ક વિગતો સેવ કરવામાં ભૂલ આવી.");
    }
});


// --- ૧૭. યુઝર ફીડબેક લોડિંગ, ડિલીટ અને સ્માર્ટ ઈમેલ રિપ્લાય બટન ---
function loadAdminFeedbacks() {
    const container = document.getElementById("admin-feedback-list");
    if (!container || !lgdCode) return;

    onSnapshot(getPanchayatCol("user_feedbacks"), (snapshot) => {
        container.innerHTML = "";
        
        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">હાલમાં કોઈ પ્રતિભાવ મળેલ નથી.</p>`;
            return;
        }

        snapshot.forEach(d => {
            const data = d.data();
            const id = d.id;
            
            let dateStr = "";
            if (data.createdAt && data.createdAt.toDate) {
                dateStr = data.createdAt.toDate().toLocaleString('gu-IN', { dateStyle: 'short', timeStyle: 'short' });
            }

            // 🌟 Gmail Web Link (ડેસ્કટોપ અને મોબાઈલ બંનેમાં 100% કામ કરશે)
            let gmailWebLink = "#";
            if (data.email) {
                const subject = encodeURIComponent("Reply from Gram Panchayat regarding your feedback");
                const body = encodeURIComponent(`નમસ્કાર ${data.name || ''},\n\nઆપના પ્રતિસાદ સંદર્ભે:\n"${data.message || ''}"\n\n`);
                // આ લિંક સીધી બ્રાઉઝરમાં જ Gmail ખોલશે
                gmailWebLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${data.email}&su=${subject}&body=${body}`;
            }

            container.innerHTML += `
                <div class="bg-gray-50 border p-3 rounded-xl shadow-sm text-xs space-y-2">
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="font-bold text-emerald-900 text-sm">👤 ${data.name || 'અનામી'}</span>
                            <span class="text-gray-500 ml-2">📞 ${data.phone || 'નંબર નથી'}</span>
                            ${data.email ? `<span class="text-blue-600 block text-[11px]">📧 ${data.email}</span>` : ''}
                        </div>
                        ${dateStr ? `<span class="text-[10px] text-gray-400">${dateStr}</span>` : ''}
                    </div>
                    
                    <p class="text-gray-700 bg-white p-2 rounded border whitespace-pre-line">${data.message || ''}</p>
                    
                    <div class="flex gap-2 justify-end pt-1">
                        ${data.email ? `
                            <a href="${gmailWebLink}" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white text-[11px] px-3 py-1.5 rounded font-semibold flex items-center gap-1 transition">
                                <i class="fa-solid fa-envelope"></i> ઈમેલ કરો / જવાબ આપો
                            </a>
                        ` : ''}
                        <button type="button" onclick="deleteFeedback('${id}')" class="bg-red-600 hover:bg-red-700 text-white text-[11px] px-3 py-1.5 rounded font-semibold flex items-center gap-1 transition">
                            <i class="fa-solid fa-trash"></i> ડિલીટ
                        </button>
                    </div>
                </div>
            `;
        });
    }, (error) => {
        console.error("Feedback Load Error:", error);
    });
}

// ફીડબેક ડિલીટ કરવા માટેનું ફંક્શન
window.deleteFeedback = async (id) => {
    if (!lgdCode) return;
    if (confirm("શું તમે આ પ્રતિસાદ ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(getPanchayatDoc("user_feedbacks", id));
            alert("✅ પ્રતિસાદ સફળતાપૂર્વક ડિલીટ થઈ ગયો!");
        } catch (err) {
            console.error("Delete Feedback Error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};


// --- ૧૮. સ્વયં જાહેર કરેલ માહિતી (Proactive Disclosure Manager) ---
async function loadProactiveAdminData() {
    if (!lgdCode) return;
    try {
        const snap = await getDoc(getPanchayatDoc("proactive_disclosure", "main_data"));
        if (snap.exists()) {
            const data = snap.data();
            
            // તાલુકો અને જિલ્લો લોડ કરવા
            if (document.getElementById("adm-taluka")) document.getElementById("adm-taluka").value = data.taluka || "";
            if (document.getElementById("adm-district")) document.getElementById("adm-district").value = data.district || "";

            // ઓફિસર વિગતો
            if (data.officer) {
                if (document.getElementById("off-name")) document.getElementById("off-name").value = data.officer.name || "";
                if (document.getElementById("off-phone")) document.getElementById("off-phone").value = data.officer.phone || "";
                if (document.getElementById("off-appeal")) document.getElementById("off-appeal").value = data.officer.appealOfficer || "";
            }

            // અન્ય માહિતી
            if (document.getElementById("extra-title-input")) document.getElementById("extra-title-input").value = data.extraTitle || "";
            if (document.getElementById("extra-content-input")) document.getElementById("extra-content-input").value = data.extraContent || "";

            // વસ્તી ટેબલ રીલોડ
            const popContainer = document.getElementById("population-rows");
            if (popContainer) {
                popContainer.innerHTML = "";
                if (data.population && data.population.length > 0) {
                    data.population.forEach(item => addPopulationRow(item));
                }
            }

            // પાણી ટેબલ રીલોડ
            const waterContainer = document.getElementById("water-rows");
            if (waterContainer) {
                waterContainer.innerHTML = "";
                if (data.water && data.water.length > 0) {
                    data.water.forEach(item => addWaterRow(item));
                }
            }

            // મિલકત ટેબલ રીલોડ
            const propContainer = document.getElementById("prop-rows");
            if (propContainer) {
                propContainer.innerHTML = "";
                if (data.property && data.property.length > 0) {
                    data.property.forEach(item => addPropRow(item));
                }
            }
        }
    } catch (err) {
        console.error("Load Proactive Admin Error:", err);
    }
}

// વસ્તી રો ઉમેરવા માટે
window.addPopulationRow = (data = {}) => {
    const container = document.getElementById("population-rows");
    if (!container) return;
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center bg-white p-2 rounded border pop-row";
    div.innerHTML = `
        <input type="text" placeholder="વિગત (દા.ત. અનુસૂચિત જાતિ)" value="${data.title || ''}" class="border p-1.5 rounded w-1/3 pop-title">
        <input type="number" placeholder="સ્ત્રી" value="${data.female || ''}" class="border p-1.5 rounded w-1/5 pop-female" oninput="calcPopTotal(this)">
        <input type="number" placeholder="પુરુષ" value="${data.male || ''}" class="border p-1.5 rounded w-1/5 pop-male" oninput="calcPopTotal(this)">
        <input type="number" placeholder="કુલ" value="${data.total || ''}" class="border p-1.5 rounded w-1/5 bg-gray-100 pop-total" readonly>
        <button type="button" onclick="this.parentElement.remove()" class="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">×</button>
    `;
    container.appendChild(div);
};

window.calcPopTotal = (element) => {
    const row = element.closest('.pop-row');
    const female = parseInt(row.querySelector('.pop-female').value) || 0;
    const male = parseInt(row.querySelector('.pop-male').value) || 0;
    row.querySelector('.pop-total').value = female + male;
};

// પાણી/જળાશય રો ઉમેરવા માટે
window.addWaterRow = (data = {}) => {
    const container = document.getElementById("water-rows");
    if (!container) return;
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center bg-white p-2 rounded border water-row";
    div.innerHTML = `
        <input type="text" placeholder="જળાશયનું નામ" value="${data.source || ''}" class="border p-1.5 rounded w-1/4 water-source">
        <input type="text" placeholder="સંખ્યા" value="${data.count || ''}" class="border p-1.5 rounded w-1/4 water-count">
        <input type="text" placeholder="વિસ્તાર (ચો.મી.)" value="${data.area || ''}" class="border p-1.5 rounded w-1/4 water-area">
        <input type="text" placeholder="ક્ષમતા (લીટર)" value="${data.capacity || ''}" class="border p-1.5 rounded w-1/4 water-cap">
        <button type="button" onclick="this.parentElement.remove()" class="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">×</button>
    `;
    container.appendChild(div);
};

// મિલકત રો ઉમેરવા માટે
window.addPropRow = (data = {}) => {
    const container = document.getElementById("prop-rows");
    if (!container) return;
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center bg-white p-2 rounded border prop-row";
    div.innerHTML = `
        <input type="text" placeholder="મિલકતનું નામ" value="${data.name || ''}" class="border p-1.5 rounded w-1/3 prop-name">
        <input type="text" placeholder="સંખ્યા" value="${data.count || ''}" class="border p-1.5 rounded w-1/4 prop-count">
        <input type="text" placeholder="અન્ય વિગત" value="${data.detail || ''}" class="border p-1.5 rounded w-1/3 prop-detail">
        <button type="button" onclick="this.parentElement.remove()" class="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">×</button>
    `;
    container.appendChild(div);
};

// એડમિન ફોર્મ સબમિટ (સેવ/અપડેટ)
document.getElementById("proactive-admin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!lgdCode) {
        alert("⚠️ LGD Code મળ્યો નથી!");
        return;
    }

    const taluka = document.getElementById("adm-taluka").value.trim();
    const district = document.getElementById("adm-district").value.trim();

    const officer = {
        name: document.getElementById("off-name").value.trim(),
        phone: document.getElementById("off-phone").value.trim(),
        appealOfficer: document.getElementById("off-appeal").value.trim()
    };

    // વસ્તી ડેટા કલેક્ટ કરો
    const population = [];
    document.querySelectorAll("#population-rows .pop-row").forEach(row => {
        population.push({
            title: row.querySelector(".pop-title").value.trim(),
            female: row.querySelector(".pop-female").value.trim(),
            male: row.querySelector(".pop-male").value.trim(),
            total: row.querySelector(".pop-total").value.trim()
        });
    });

    // પાણી ડેટા કલેક્ટ કરો
    const water = [];
    document.querySelectorAll("#water-rows .water-row").forEach(row => {
        water.push({
            source: row.querySelector(".water-source").value.trim(),
            count: row.querySelector(".water-count").value.trim(),
            area: row.querySelector(".water-area").value.trim(),
            capacity: row.querySelector(".water-cap").value.trim()
        });
    });

    // મિલકત ડેટા કલેક્ટ કરો
    const property = [];
    document.querySelectorAll("#prop-rows .prop-row").forEach(row => {
        property.push({
            name: row.querySelector(".prop-name").value.trim(),
            count: row.querySelector(".prop-count").value.trim(),
            detail: row.querySelector(".prop-detail").value.trim()
        });
    });

    const payload = {
        taluka,
        district,
        officer,
        population,
        water,
        property,
        extraTitle: document.getElementById("extra-title-input")?.value.trim() || "",
        extraContent: document.getElementById("extra-content-input")?.value.trim() || "",
        updatedAt: new Date()
    };

    try {
        await setDoc(getPanchayatDoc("proactive_disclosure", "main_data"), payload, { merge: true });
        alert("✅ સ્વયં જાહેર કરેલ માહિતી અને સ્થાન સફળતાપૂર્વક સેવ થઈ ગયું!");
    } catch (err) {
        console.error("Save Proactive Error:", err);
        alert("માહિતી સેવ કરવામાં ભૂલ આવી.");
    }
});



// --- ૧૯. ડાઉનલોડ્સ પેજ મેનેજર ---
async function loadDownloadsAdminData() {
    if (!lgdCode) return;
    try {
        const snap = await getDoc(getPanchayatDoc("downloads_page", "main_content"));
        if (snap.exists()) {
            const data = snap.data();
            if (document.getElementById("adm-downloads-text")) {
                document.getElementById("adm-downloads-text").value = data.pageText || "";
            }

            const container = document.getElementById("download-rows");
            if (container) {
                container.innerHTML = "";
                if (data.files && data.files.length > 0) {
                    data.files.forEach(item => addDownloadRow(item));
                }
            }
        }
    } catch (err) {
        console.error("Load Downloads Admin Error:", err);
    }
}

// ડાઉનલોડ રો ઉમેરવા માટે
window.addDownloadRow = (data = {}) => {
    const container = document.getElementById("download-rows");
    if (!container) return;
    const div = document.createElement("div");
    div.className = "bg-white p-3 rounded-lg border space-y-2 dl-row shadow-sm";
    div.innerHTML = `
        <div class="flex justify-between items-center">
            <span class="font-bold text-emerald-900 text-[11px]">ફાઇલ વિગત</span>
            <button type="button" onclick="this.closest('.dl-row').remove()" class="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">ડિલીટ કરો</button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input type="text" placeholder="પીડીએફ ફાઇલનું નામ (દા.ત. Gram Darshan Booklet)" value="${data.title || ''}" class="border p-1.5 rounded w-full dl-title" required>
            <input type="url" placeholder="ડાઉનલોડ લિંક (Google Drive / PDF URL)" value="${data.link || ''}" class="border p-1.5 rounded w-full dl-link" required>
        </div>
        <textarea placeholder="ટૂંકી વિગત (Description)..." rows="1" class="border p-1.5 rounded w-full dl-desc">${data.description || ''}</textarea>
    `;
    container.appendChild(div);
};

// એડમિન ફોર્મ સબમિટ (સેવ/અપડેટ)
document.getElementById("downloads-admin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // 🌟 1. LGD Code ની ખાતરી કરો
    if (!lgdCode) {
        alert("❌ ભૂલ: LGD Code (Panchayat ID) મળ્યો નથી! કૃપા કરીને પેજ રીલોડ કરો.");
        return;
    }

    const pageText = document.getElementById("adm-downloads-text").value.trim();
    const files = [];

    document.querySelectorAll("#download-rows .dl-row").forEach(row => {
        files.push({
            title: row.querySelector(".dl-title").value.trim(),
            link: row.querySelector(".dl-link").value.trim(),
            description: row.querySelector(".dl-desc").value.trim()
        });
    });

    const payload = {
        pageText,
        files,
        updatedAt: new Date()
    };

    try {
        // 🌟 2. ફાયરબેઝ પાથ સાચો છે કે નહીં તેની ચકાસણી માટે કન્સોલ પ્રિન્ટ
        console.log("Saving to path: panchayats/" + lgdCode + "/downloads_page/main_content");
        
        await setDoc(getPanchayatDoc("downloads_page", "main_content"), payload, { merge: true });
        
        alert("✅ ડાઉનલોડ્સ માહિતી સફળતાપૂર્વક ફાયરબેઝમાં સેવ થઈ ગઈ!");
        
        // સેવ થયા પછી ડેટા રીલોડ કરો જેથી ખાતરી થાય
        loadDownloadsAdminData();
    } catch (err) {
        console.error("Save Downloads Error Details:", err);
        alert("❌ સેવ કરતી વખતે એરર આવી: " + err.message);
    }
});




// --- ૨૦. તાલુકા ડેટા કલેક્શન અને ડ્યુઅલ એક્સચેન્જ મેનેજર (પંચાયત એડમિન સાઈડ) ---

window.openTalukaSheetModal = function() {
    document.getElementById("taluka-sheet-modal")?.classList.remove("hidden");
    loadPanchayatDataExchangeForms();
};

window.closeTalukaSheetModal = function() {
    document.getElementById("taluka-sheet-modal")?.classList.add("hidden");
};

// નોટિફિકેશન ચેક (બંને શીટ્સ માટે)
async function checkTalukaNotification() {
    try {
        if (!lgdCode) return;
        const pSnap = await getDoc(doc(db, "panchayats", lgdCode));
        if (!pSnap.exists()) return;
        const talukaName = pSnap.data().taluka;
        if (!talukaName) return;

        let hasActiveRequest = false;
        for (let sheetKey of ['sheet_1', 'sheet_2']) {
            const sheetSnap = await getDoc(doc(db, "taluka_sheets", `${talukaName}_${sheetKey}`));
            if (sheetSnap.exists()) {
                const data = sheetSnap.data();
                const headers = data.headers || [];
                const selectedPanchayats = data.selectedPanchayats || [];
                if (headers.length > 0 && (selectedPanchayats.length === 0 || selectedPanchayats.includes(lgdCode))) {
                    hasActiveRequest = true;
                    break;
                }
            }
        }

        if (hasActiveRequest) {
            document.getElementById("taluka-req-badge")?.classList.remove("hidden");
        } else {
            document.getElementById("taluka-req-badge")?.classList.add("hidden");
        }
    } catch (e) {
        console.error("Notification check error:", e);
    }
}

// પંચાયત એડમિન પેનલ પર બંને શીટ્સના ફોર્મ્સ લોડ કરવા
async function loadPanchayatDataExchangeForms() {
    const container = document.getElementById("panchayat-sheet-form-container");
    if (!container) return;

    container.innerHTML = `<div class="text-center py-8 text-gray-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i> ફોર્મ્સ લોડ થઈ રહ્યા છે...</div>`;

    try {
        if (!lgdCode) {
            container.innerHTML = `<p class="text-center text-gray-500 py-6">LGD Code મળ્યો નથી.</p>`;
            return;
        }

        const pSnap = await getDoc(doc(db, "panchayats", lgdCode));
        if (!pSnap.exists()) return;
        const talukaName = pSnap.data().taluka;

        if (!talukaName) {
            container.innerHTML = `<p class="text-center text-gray-500 py-6">પંચાયતનો તાલુકો રજીસ્ટર થયેલ નથી.</p>`;
            return;
        }

        let combinedHtml = "";

        for (let sheetKey of ['sheet_1', 'sheet_2']) {
            const sheetSnap = await getDoc(doc(db, "taluka_sheets", `${talukaName}_${sheetKey}`));
            if (!sheetSnap.exists() || !sheetSnap.data().headers?.length) continue;

            const sheetConfig = sheetSnap.data();
            const headers = sheetConfig.headers || [];
            const deadline = sheetConfig.deadline || "";
            const selectedPanchayats = sheetConfig.selectedPanchayats || [];

            if (selectedPanchayats.length > 0 && !selectedPanchayats.includes(lgdCode)) continue;

            const sheetDisplayName = sheetKey === 'sheet_1' ? 'માહિતી શીટ ૧ (Sheet 1)' : 'માહિતી શીટ ૨ (Sheet 2)';

            const subSnap = await getDoc(doc(db, "panchayats", lgdCode, "submitted_reports", `${sheetKey}_data`));
            const existingData = subSnap.exists() ? subSnap.data().values || {} : {};

            combinedHtml += `
                <div class="bg-gray-50 border p-4 rounded-xl space-y-3 mb-4 shadow-sm">
                    <div class="flex justify-between items-center border-b pb-2">
                        <h4 class="font-bold text-emerald-900 text-sm"><i class="fa-solid fa-file-excel mr-1"></i> ${sheetDisplayName}</h4>
                        ${deadline ? `<span class="text-[11px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-bold">⏰ સમયમર્યાદા: ${deadline}</span>` : ''}
                    </div>
                    <form id="form-${sheetKey}" class="space-y-3 submitted-sheet-form" data-sheet="${sheetKey}">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            `;

            headers.forEach(h => {
                const val = existingData[h] || "";
                combinedHtml += `
                    <div>
                        <label class="block font-bold text-gray-700 mb-1 text-xs">${h}:</label>
                        <input type="text" name="${h}" value="${val}" placeholder="${h} અહીં લખો..." required class="w-full border p-2 rounded bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-xs">
                    </div>
                `;
            });

            combinedHtml += `
                        </div>
                        <div class="text-right">
                            <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded shadow transition text-xs">
                                <i class="fa-solid fa-cloud-arrow-up mr-1"></i> ${sheetDisplayName} સબમિટ કરો
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }

        if (!combinedHtml) {
            container.innerHTML = `<div class="bg-white border p-6 rounded-xl text-center text-gray-500">હાલમાં તાલુકા તરફથી કોઈ પણ શીટ માટે માહિતી માંગવામાં આવી નથી.</div>`;
            return;
        }

        container.innerHTML = combinedHtml;

        // સબમિટ ઇવેન્ટ્સ બાઈન્ડ કરવી
        document.querySelectorAll(".submitted-sheet-form").forEach(form => {
            form.addEventListener("submit", async (e) => {
                e.preventDefault();
                const sKey = form.getAttribute("data-sheet");
                const formData = new FormData(form);
                let values = {};
                formData.forEach((value, key) => { values[key] = value.trim(); });

                try {
                    await setDoc(doc(db, "panchayats", lgdCode, "submitted_reports", `${sKey}_data`), {
                        values,
                        updatedAt: new Date()
                    }, { merge: true });

                    alert(`✅ ${sKey === 'sheet_1' ? 'શીટ ૧' : 'શીટ ૨'} ની માહિતી સફળતાપૂર્વક સબમિટ થઈ ગઈ!`);
                } catch (err) {
                    console.error("Error submitting report:", err);
                    alert("સબમિટ કરવામાં ભૂલ આવી: " + err.message);
                }
            });
        });

    } catch (err) {
        console.error("Error loading panchayat exchange forms:", err);
        container.innerHTML = `<p class="text-red-500 text-center py-4 text-xs">ફોર્મ્સ લોડ કરવામાં એરર આવી.</p>`;
    }
}
// --- ૨૦. તાલુકા ડેટા કલેક્શન અને એક્સચેન્જ મેનેજર (પંચાયત એડમિન સાઈડકોડ પૂર્ણ) ---



