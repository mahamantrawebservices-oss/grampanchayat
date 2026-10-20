import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, updateDoc, getDocs, doc, setDoc, getDoc, deleteDoc, query, orderBy, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Direct Firebase Configuration
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

let currentPanchayatId = null;
let currentPanchayatData = null;

// Page load thavathi URL athva Storage mathi ID check karvo
async function initAdminAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    currentPanchayatId = urlParams.get('id');

    if (currentPanchayatId) {
        await verifyAndSetupPanchayat(currentPanchayatId);
    } else {
        const titleEl = document.getElementById("panchayat-login-title");
        if (titleEl) {
            titleEl.textContent = "કૃપા કરીને તમારો પંચાયત આઈડી અને પાસવર્ડ નાખો";
        }
        showLoginModal();
    }
}

// Panchayat ID verify karvani function
async function verifyAndSetupPanchayat(pId) {
    try {
        const pRef = doc(db, "panchayats", pId);
        const pSnap = await getDoc(pRef);

        if (!pSnap.exists()) {
            alert("આ પંચાયત આઈડી સિસ્ટમમાં મળ્યો નથી! કૃપા કરીને સાચો આઈડી નાખો.");
            showLoginModal();
            return false;
        }

        currentPanchayatId = pId;
        currentPanchayatData = pSnap.data();
        
        const titleEl = document.getElementById("panchayat-login-title");
        if (titleEl) {
            titleEl.textContent = `${currentPanchayatData.panchayatName || 'ગ્રામ પંચાયત'} (${currentPanchayatData.taluka || ''}, ${currentPanchayatData.district || ''})`;
        }

        const headerTitle = document.getElementById("dashboard-header-title");
        if (headerTitle) {
            headerTitle.textContent = `${currentPanchayatData.panchayatName} - એડમિન પેનલ`;
        }

        const savedSession = sessionStorage.getItem(`panchayat_session_${currentPanchayatId}`);
        if (savedSession === "true") {
            showDashboard();
        } else {
            showLoginModal();
        }
        return true;
    } catch (err) {
        console.error("Error verifying panchayat:", err);
        return false;
    }
}

function showLoginModal() {
    document.getElementById("login-modal")?.classList.remove("hidden");
    document.getElementById("admin-dashboard")?.classList.add("hidden");
}

function showDashboard() {
    document.getElementById("login-modal")?.classList.add("hidden");
    document.getElementById("admin-dashboard")?.classList.remove("hidden");
    loadAllAdminData();
}

// Login Form Submit Handler
document.getElementById("admin-login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const enteredIdOrName = document.getElementById("login-email")?.value.trim();
    const enteredPass = document.getElementById("login-password")?.value.trim();

    if (!enteredIdOrName || !enteredPass) {
        alert("બધા જ ખાના ભરવા જરૂરી છે!");
        return;
    }

    if (!currentPanchayatId) {
        const found = await verifyAndSetupPanchayat(enteredIdOrName);
        if (!found) {
            alert("આ આઈડીવાળી કોઈ પંચાયત મળી નથી!");
            return;
        }
    }

    if (!currentPanchayatData) {
        alert("પંચાયતનો ડેટા લોડ થયો નથી.");
        return;
    }

    const correctPassword = currentPanchayatData.adminPassword;

    if (!correctPassword) {
        alert("આ પંચાયત માટે સુપર એડમિન દ્વારા કોઈ પાસવર્ડ રાખેલ નથી!");
        return;
    }

    if (enteredPass === correctPassword) {
        sessionStorage.setItem(`panchayat_session_${currentPanchayatId}`, "true");
        showDashboard();
    } else {
        alert("ખોટો પાસવર્ડ! કૃપા કરીને સુપર એડમિન પેનલ પરથી પાસવર્ડ ચકાસો.");
    }
});

// Logout Button
document.getElementById("logout-btn")?.addEventListener("click", () => {
    if (currentPanchayatId) {
        sessionStorage.removeItem(`panchayat_session_${currentPanchayatId}`);
    }
    window.location.href = window.location.pathname;
});

// તમામ ડેટા લોડ કરવાનું કોલબેક
function loadAllAdminData() {
    loadAdminComplaints();
    loadAdminGallery();
    loadAdminMeta();
    loadAdminStaffAndCommittee();
    loadAdminSchedule();
    loadAdminMenuList();
    loadAdminTaxLink();
    loadAdminCustomButtons();
    loadAdminEvents();
    loadAdminPosts();
    loadNotices();
    loadActiveCommittees();
    loadAdminGlanceList();
    loadContactAdminData();
    loadAdminFeedbacks();
    loadAdminData();
}

// ૧. વેબસાઇટ સેટિંગ્સ
document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("set-gp-name")?.value;
    const tagline = document.getElementById("set-gp-tagline")?.value;

    await setDoc(doc(db, "panchayats", currentPanchayatId, "settings", "general"), {
        ...(name && { name }),
        ...(tagline && { tagline })
    }, { merge: true });

    alert("સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગયા!");
});

// ૨. તાજી પોસ્ટ્સ અને ન્યૂઝ મેનેજર
let postsCache = {};

function resetPostForm() {
    const form = document.getElementById('add-post-form');
    if (!form) return;
    form.reset();
    document.getElementById('edit-post-id').value = "";
    document.getElementById('submit-post-btn').textContent = "પોસ્ટ ઉમેરો";
    document.getElementById('cancel-post-edit-btn').classList.add('hidden');
}

document.getElementById('cancel-post-edit-btn')?.addEventListener('click', resetPostForm);

document.getElementById("add-post-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-post-id").value;
    const title = document.getElementById("post-title").value.trim();
    const desc = document.getElementById("post-desc").value.trim();

    try {
        if (editId) {
            await updateDoc(doc(db, "panchayats", currentPanchayatId, "posts", editId), {
                title, desc, type: 'post', updatedAt: new Date()
            });
            alert("પોસ્ટ સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
        } else {
            await addDoc(collection(db, "panchayats", currentPanchayatId, "posts"), {
                title, desc, type: 'post', createdAt: new Date()
            });
            alert("નવી પોસ્ટ સફળતાપૂર્વક ઉમેરાઈ ગઈ!");
        }
        resetPostForm();
    } catch (error) {
        console.error("Error saving post:", error);
        alert("સાચવવામાં ભૂલ આવી, ફરી પ્રયત્ન કરો.");
    }
});

function loadAdminPosts() {
    const container = document.getElementById("admin-posts-list");
    if (!container || !currentPanchayatId) return;

    onSnapshot(collection(db, "panchayats", currentPanchayatId, "posts"), (snapshot) => {
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

            const title = data.title || data.heading || "અનામી પોસ્ટ";
            const desc = data.desc || data.description || "";
            
            let dateStr = "તારીખ ઉપલબ્ધ નથી";
            if (data.createdAt?.toDate) {
                dateStr = data.createdAt.toDate().toLocaleDateString('gu-IN');
            } else if (data.date) {
                dateStr = data.date;
            }

            const card = document.createElement("div");
            card.className = "bg-gray-50 border p-3 rounded-lg flex justify-between items-start gap-2 text-xs mb-2";
            card.innerHTML = `
                <div class="space-y-1 flex-1">
                    <div class="flex items-center gap-2">
                        <h5 class="font-bold text-emerald-800 text-sm">${title}</h5>
                        <span class="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">${dateStr}</span>
                    </div>
                    ${desc ? `<p class="text-gray-600 text-[11px] whitespace-pre-line">${desc}</p>` : ''}
                </div>
                <div class="flex gap-1.5 shrink-0">
                    <button onclick="editPost('${id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-bold">એડિટ</button>
                    <button onclick="deletePost('${id}')" class="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold">ડિલીટ</button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

window.editPost = (id) => {
    const data = postsCache[id];
    if (!data) return;
    document.getElementById('edit-post-id').value = id;
    document.getElementById('post-title').value = data.title || "";
    document.getElementById('post-desc').value = data.desc || "";
    document.getElementById('submit-post-btn').textContent = "અપડેટ કરો";
    document.getElementById('cancel-post-edit-btn').classList.remove('hidden');
    document.getElementById('add-post-form').scrollIntoView({ behavior: 'smooth' });
};

window.deletePost = async (id) => {
    if (confirm("શું તમે ખરેખર આ પોસ્ટ ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(doc(db, "panchayats", currentPanchayatId, "posts", id));
            alert("પોસ્ટ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!");
            if (document.getElementById('edit-post-id').value === id) resetPostForm();
        } catch (err) {
            console.error("Delete error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

// ૩. નોટિસ મૂકો
let noticesCache = {};

function resetNoticeForm() {
    const form = document.getElementById('add-notice-form');
    if (!form) return;
    form.reset();
    document.getElementById('edit-notice-id').value = "";
    document.getElementById('submit-notice-btn').textContent = "નોટિસ પોસ્ટ કરો";
    document.getElementById('cancel-notice-edit-btn').classList.add('hidden');
}

document.getElementById('cancel-notice-edit-btn')?.addEventListener('click', resetNoticeForm);

document.getElementById("add-notice-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-notice-id").value;
    const title = document.getElementById("notice-title").value.trim();
    const desc = document.getElementById("notice-desc").value.trim();

    try {
        if (editId) {
            await updateDoc(doc(db, "panchayats", currentPanchayatId, "notices", editId), {
                title, desc, updatedAt: new Date()
            });
            alert("નોટિસ સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
        } else {
            await addDoc(collection(db, "panchayats", currentPanchayatId, "notices"), {
                title, desc, createdAt: new Date()
            });
            alert("નવી નોટિસ સફળતાપૂર્વક સાચવાઈ ગઈ!");
        }
        resetNoticeForm();
    } catch (error) {
        console.error("Error saving notice:", error);
        alert("સાચવવામાં ભૂલ આવી, ફરી પ્રયત્ન કરો.");
    }
});

function loadNotices() {
    const container = document.getElementById("admin-notices-list");
    if (!container || !currentPanchayatId) return;

    onSnapshot(collection(db, "panchayats", currentPanchayatId, "notices"), (snapshot) => {
        container.innerHTML = "";
        noticesCache = {};

        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">કોઈ નોટિસ કે પોસ્ટ મળેલી નથી.</p>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            noticesCache[id] = data;

            const title = data.title || data.noticeTitle || "અનામી પોસ્ટ / નોટિસ";
            const desc = data.desc || data.description || "";
            
            let dateStr = "તારીખ ઉપલબ્ધ નથી";
            if (data.createdAt?.toDate) {
                dateStr = data.createdAt.toDate().toLocaleDateString('gu-IN');
            }

            const card = document.createElement("div");
            card.className = "bg-gray-50 border p-3 rounded-lg flex justify-between items-start gap-2 text-xs mb-2";
            card.innerHTML = `
                <div class="space-y-1 flex-1">
                    <div class="flex items-center gap-2">
                        <h4 class="font-bold text-gray-800 text-sm">${title}</h4>
                        <span class="text-[10px] text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">${dateStr}</span>
                    </div>
                    ${desc ? `<p class="text-gray-600 text-[11px] whitespace-pre-line">${desc}</p>` : ''}
                </div>
                <div class="flex gap-1.5 shrink-0">
                    <button onclick="editNotice('${id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-bold">એડિટ</button>
                    <button onclick="deleteNotice('${id}')" class="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold">ડિલીટ</button>
                </div>
            `;
            container.appendChild(card);
        });
    });
}

window.editNotice = (id) => {
    const data = noticesCache[id];
    if (!data) return;
    document.getElementById('edit-notice-id').value = id;
    document.getElementById('notice-title').value = data.title || "";
    document.getElementById('notice-desc').value = data.desc || "";
    document.getElementById('submit-notice-btn').textContent = "અપડેટ કરો";
    document.getElementById('cancel-notice-edit-btn').classList.remove('hidden');
    document.getElementById('add-notice-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteNotice = async (id) => {
    if (confirm("શું તમે ખરેખર આ નોટિસ ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(doc(db, "panchayats", currentPanchayatId, "notices", id));
            alert("નોટિસ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!");
            if (document.getElementById('edit-notice-id').value === id) resetNoticeForm();
        } catch (err) {
            console.error("Delete error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

// ૪. ફોટો ગેલેરી
document.getElementById("gallery-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("img-title").value;
    const url = document.getElementById("img-url").value;

    await addDoc(collection(db, "panchayats", currentPanchayatId, "gallery"), {
        title, imageUrl: url, createdAt: new Date()
    });

    alert("ફોટો ગેલેરીમાં સફળતાપૂર્વક ઉમેરાઈ ગયો!");
    e.target.reset();
    loadAdminGallery();
});

async function loadAdminGallery() {
    if (!currentPanchayatId) return;
    const snap = await getDocs(collection(db, "panchayats", currentPanchayatId, "gallery"));
    const container = document.getElementById("admin-gallery-list");
    if (!container) return;
    
    container.innerHTML = "";
    if (snap.empty) {
        container.innerHTML = "<p class='text-xs text-gray-500'>કોઈ ફોટો મળેલો નથી.</p>";
        return;
    }

    snap.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        container.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm">
                <div class="flex items-center gap-2 overflow-hidden">
                    <img src="${item.imageUrl}" class="w-8 h-8 object-cover rounded flex-shrink-0">
                    <span class="text-xs font-semibold text-gray-700 truncate">${item.title}</span>
                </div>
                <button data-id="${id}" class="delete-gallery-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded transition flex-shrink-0">
                    ડિલીટ
                </button>
            </div>
        `;
    });

    document.querySelectorAll(".delete-gallery-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const docId = e.target.getAttribute("data-id");
            if (confirm("શું તમે આ ફોટો ગેલેરીમાંથી કાઢી નાખવા માંગો છો?")) {
                await deleteDoc(doc(db, "panchayats", currentPanchayatId, "gallery", docId));
                alert("ફોટો સફળતાપૂર્વક ડિલીટ થઈ ગયો છે.");
                loadAdminGallery();
            }
        });
    });
}

// ૫. Quill Word Editor
let menuQuill = null;
if (document.getElementById('menu-editor-container')) {
    menuQuill = new Quill('#menu-editor-container', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['clean']
            ]
        }
    });
}

document.getElementById("add-menu-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-menu-id").value;
    const title = document.getElementById("menu-title").value.trim();
    const content = typeof menuQuill !== 'undefined' ? menuQuill.root.innerHTML : "";

    try {
        if (editId) {
            await setDoc(doc(db, "panchayats", currentPanchayatId, "village_details", editId), {
                title, content, updatedAt: new Date()
            }, { merge: true });

            alert("મેનૂ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
        } else {
            await addDoc(collection(db, "panchayats", currentPanchayatId, "village_details"), {
                title, content, isShow: true, createdAt: new Date()
            });

            alert("નવું મેનૂ સફળતાપૂર્વક ઉમેરાઈ ગયું!");
        }

        resetMenuForm();
        loadAdminMenuList();
    } catch (err) {
        console.error("Error saving village menu:", err);
        alert("મેનૂ સાચવવામાં ભૂલ આવી.");
    }
});

function resetMenuForm() {
    document.getElementById("add-menu-form")?.reset();
    if (document.getElementById("edit-menu-id")) document.getElementById("edit-menu-id").value = "";
    if (typeof menuQuill !== 'undefined') menuQuill.root.innerHTML = "";
    if (document.getElementById("save-menu-btn")) document.getElementById("save-menu-btn").innerText = "મેનૂ સેવ કરો";
    document.getElementById("cancel-edit-btn")?.classList.add("hidden");
}

document.getElementById("cancel-edit-btn")?.addEventListener("click", resetMenuForm);

async function loadAdminMenuList() {
    const container = document.getElementById("admin-menu-list");
    if (!container || !currentPanchayatId) return;

    try {
        container.innerHTML = "<p class='text-xs text-gray-500'>મેનૂ લોડ થઈ રહ્યા છે...</p>";
        const querySnapshot = await getDocs(collection(db, "panchayats", currentPanchayatId, "village_details"));
        container.innerHTML = "";

        if (querySnapshot.empty) {
            container.innerHTML = "<p class='text-xs text-gray-500'>કોઈ મેનૂ મળેલ નથી.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            const isShow = item.isShow !== false;

            container.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm mb-1">
                    <span class="text-xs font-semibold ${isShow ? 'text-gray-800' : 'text-gray-400 line-through'}">${item.title || 'નામ વગરનું મેનૂ'}</span>
                    <div class="flex items-center gap-1.5">
                        <button type="button" data-id="${id}" class="edit-menu-btn bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded font-bold">એડિટ</button>
                        <button type="button" data-id="${id}" data-status="${isShow}" class="toggle-show-btn text-[10px] px-2 py-1 rounded text-white ${isShow ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-500 hover:bg-gray-600'} font-bold">
                            ${isShow ? 'સંતાડો' : 'બતાવો'}
                        </button>
                        <button type="button" data-id="${id}" class="delete-menu-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded font-bold">ડિલીટ</button>
                    </div>
                </div>
            `;
        });

        attachMenuEventListeners();
    } catch (err) {
        console.error("❌ Menu Load Error:", err);
        container.innerHTML = `<p class='text-xs text-red-500'>મેનૂ લોડ કરવામાં ભૂલ: ${err.message}</p>`;
    }
}

function attachMenuEventListeners() {
    document.querySelectorAll(".edit-menu-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            try {
                const docSnap = await getDoc(doc(db, "panchayats", currentPanchayatId, "village_details", id));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    document.getElementById("edit-menu-id").value = id;
                    document.getElementById("menu-title").value = data.title || "";
                    if (typeof menuQuill !== 'undefined' && menuQuill) {
                        menuQuill.root.innerHTML = data.content || "";
                    }
                    document.getElementById("save-menu-btn").innerText = "અપડેટ કરો";
                    document.getElementById("cancel-edit-btn").classList.remove("hidden");
                    document.getElementById("add-menu-form")?.scrollIntoView({ behavior: 'smooth' });
                }
            } catch (err) {
                console.error("Error fetching menu for edit:", err);
            }
        });
    });

    document.querySelectorAll(".toggle-show-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const currentStatus = e.target.getAttribute("data-status") === "true";
            try {
                await setDoc(doc(db, "panchayats", currentPanchayatId, "village_details", id), { isShow: !currentStatus }, { merge: true });
                loadAdminMenuList();
            } catch (err) {
                console.error("Error toggling status:", err);
            }
        });
    });

    document.querySelectorAll(".delete-menu-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            if (confirm("શું તમે આ મેનૂ ડિલીટ કરવા માંગો છો?")) {
                try {
                    await deleteDoc(doc(db, "panchayats", currentPanchayatId, "village_details", id));
                    loadAdminMenuList();
                } catch (err) {
                    console.error("Error deleting menu:", err);
                    alert("ડિલીટ કરવામાં ભૂલ આવી.");
                }
            }
        });
    });
}

// ૬. ફરિયાદો
async function cleanOldComplaints() {
    if (!currentPanchayatId) return;
    try {
        const sixMonthsAgo = Timestamp.fromDate(new Date(Date.now() - 180 * 24 * 60 * 60 * 1000));
        const q = query(collection(db, "panchayats", currentPanchayatId, "complaints"), where("createdAt", "<", sixMonthsAgo));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map(d => deleteDoc(doc(db, "panchayats", currentPanchayatId, "complaints", d.id)));
        await Promise.all(deletePromises);
    } catch (error) {
        console.error("Auto cleanup error:", error);
    }
}

function formatDateTime(timestamp) {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('gu-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });
}

async function loadAdminComplaints() {
    if (!currentPanchayatId) return;
    cleanOldComplaints();
    const filter = document.getElementById("admin-complaint-filter")?.value || "ALL";
    const snap = await getDocs(collection(db, "panchayats", currentPanchayatId, "complaints"));
    const container = document.getElementById("admin-complaint-list");
    if(!container) return;

    container.innerHTML = "";
    snap.forEach(d => {
        const item = d.data();
        const isPending = item.status?.includes("પેન્ડિંગ") || item.status?.includes("ચાલ") || item.status?.includes("નથી");
        
        if (filter === "PENDING" && !isPending) return;

        const formattedDate = formatDateTime(item.createdAt);

        container.innerHTML += `
            <div class="bg-white p-3 border rounded shadow-sm space-y-2 text-xs mb-2">
                <div class="flex justify-between font-bold text-gray-800 border-b pb-1">
                    <span>ટોકન: <span class="text-amber-600">${item.token || 'N/A'}</span> (${item.name || ''} - ${item.mobile || ''})</span>
                    <span class="text-emerald-700">${item.type || ''}</span>
                </div>
                <p><b>તારીખ & સમય:</b> <span class="text-blue-600 font-semibold">${formattedDate}</span></p>
                <p><b>વિસ્તાર:</b> ${item.area || ''} | <b>વિગત:</b> ${item.details || ''}</p>
                <div class="flex flex-wrap items-center gap-2">
                    <label class="font-bold">સ્ટેટસ બદલો:</label>
                    <select data-id="${d.id}" class="update-status-select border p-1 rounded bg-amber-50">
                        <option value="${item.status}" selected>હાલનું: ${item.status}</option>
                        <option value="ફરિયાદ પર કામ ચાલી રહ્યું છે">ફરિયાદ પર કામ ચાલી રહ્યું છે</option>
                        <option value="ફરિયાદ નિવારણ થઈ ગયું છે">ફરિયાદ નિવારણ થઈ ગયું છે</option>
                        <option value="ફરિયાદ આ વિભાગની ના હોય દફતરે કરવામાં આવેલ છે">ફરિયાદ આ વિભાગની ના હોય દફતરે કરવામાં આવેલ છે</option>
                        <option value="ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે">ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે</option>
                        <option value="ફરિયાદ પર હાલ કામ થઈ શકે તેમ નથી">ફરિયાદ પર હાલ કામ થઈ શકે તેમ નથી</option>
                        <option value="ફરિયાદ અયોગ્ય હોય રદ કરવામાં આવેલ છે">ફરિયાદ અયોગ્ય હોય રદ કરવામાં આવેલ છે</option>
                    </select>
                </div>
            </div>
        `;
    });

    document.querySelectorAll(".update-status-select").forEach(sel => {
        sel.addEventListener("change", async (e) => {
            const id = e.target.getAttribute("data-id");
            await setDoc(doc(db, "panchayats", currentPanchayatId, "complaints", id), { status: e.target.value }, { merge: true });
            alert("ફરિયાદનું સ્ટેટસ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
            loadAdminComplaints();
        });
    });
}

document.getElementById("admin-complaint-filter")?.addEventListener("change", loadAdminComplaints);

// PDF રિપોર્ટ
document.getElementById("download-pdf-btn")?.addEventListener("click", async () => {
    const selectedMonth = document.getElementById("report-month-select")?.value;
    if (!selectedMonth) {
        alert("મહેરબાની કરીને રિપોર્ટ માટે મહિનો સિલેક્ટ કરો!");
        return;
    }

    const [year, month] = selectedMonth.split("-");
    const dateObj = new Date(year, month - 1);
    const monthNames = ["જાન્યુઆરી", "ફેબ્રુઆરી", "માર્ચ", "એપ્રિલ", "મે", "જૂન", "જુલાઈ", "ઓગસ્ટ", "સપ્ટેમ્બર", "ઓક્ટોબર", "નવેમ્બર", "ડિસેમ્બર"];
    const monthGujarati = monthNames[dateObj.getMonth()];

    const snap = await getDocs(collection(db, "panchayats", currentPanchayatId, "complaints"));
    
    const reportContainer = document.createElement("div");
    reportContainer.id = "temp-pdf-container";
    reportContainer.style.width = "1000px";
    reportContainer.style.padding = "20px";
    reportContainer.style.backgroundColor = "#ffffff";
    reportContainer.style.color = "#000000";
    reportContainer.style.fontFamily = "'Noto Sans Gujarati', 'Shruti', 'Gujarati', sans-serif";

    let reportHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #1e3a8a; font-size: 20px; font-weight: bold; margin: 0;">
                માસિક ફરિયાદ રિપોર્ટ માહે : ${monthGujarati} - ${year}
            </h2>
        </div>
        <table border="1" style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; border: 1px solid #666;">
            <thead>
                <tr style="background-color: #e2e8f0; color: #000; font-weight: bold;">
                    <th style="padding: 8px; border: 1px solid #666;">ટોકન</th>
                    <th style="padding: 8px; border: 1px solid #666;">તારીખ & સમય</th>
                    <th style="padding: 8px; border: 1px solid #666;">નામ & મોબાઈલ</th>
                    <th style="padding: 8px; border: 1px solid #666;">પ્રકાર</th>
                    <th style="padding: 8px; border: 1px solid #666;">વિસ્તાર</th>
                    <th style="padding: 8px; border: 1px solid #666;">સ્ટેટસ</th>
                </tr>
            </thead>
            <tbody>
    `;

    let count = 0;
    snap.forEach(d => {
        const item = d.data();
        let itemDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);

        if (!itemDate || isNaN(itemDate.getTime())) return;

        if (itemDate.getFullYear() == year && (itemDate.getMonth() + 1) == month) {
            count++;
            reportHTML += `
                <tr>
                    <td style="padding: 8px; border: 1px solid #666;">${item.token || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${formatDateTime(item.createdAt || item.date)}</td>
                    <td style="padding: 8px; border: 1px solid #666;"><b>${item.name || '-'}</b><br>(${item.mobile || '-'})</td>
                    <td style="padding: 8px; border: 1px solid #666;">${item.type || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${item.area || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #666;">${item.status || '-'}</td>
                </tr>
            `;
        }
    });

    reportHTML += `</tbody></table>`;

    if (count === 0) {
        alert("પસંદ કરેલ મહિના માટે કોઈ ફરિયાદો મળી નથી.");
        return;
    }

    reportContainer.innerHTML = reportHTML;
    document.body.appendChild(reportContainer);

    const opt = {
        margin: 0.3,
        filename: `Complaint_Report_${monthGujarati}_${year}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };

    try {
        await html2pdf().set(opt).from(reportContainer).save();
    } catch (err) {
        console.error("PDF જનરેટ કરવામાં ભૂલ:", err);
        alert("PDF ડાઉનલોડ કરવામાં સમસ્યા આવી!");
    } finally {
        document.body.removeChild(reportContainer);
    }
});

// ૭. Meta Details
async function loadAdminMeta() {
    if (!currentPanchayatId) return;
    try {
        const snap = await getDoc(doc(db, "panchayats", currentPanchayatId, "panchayat_meta", "staff_page"));
        if (snap.exists()) {
            const data = snap.data();
            if (document.getElementById("admin-term-input")) document.getElementById("admin-term-input").value = data.term || "";
            if (document.getElementById("admin-note-input")) document.getElementById("admin-note-input").value = data.note || "";
        }
    } catch (err) {
        console.error("Meta loading error:", err);
    }
}

document.getElementById("save-meta-btn")?.addEventListener("click", async () => {
    const term = document.getElementById("admin-term-input").value;
    const note = document.getElementById("admin-note-input").value;
    await setDoc(doc(db, "panchayats", currentPanchayatId, "panchayat_meta", "staff_page"), { term, note }, { merge: true });
    alert("મુદત અને નોંધ સફળતાપૂર્વક સાચવી લેવાયેલ છે!");
});

// ૮. સ્ટાફ અને કમિટી
async function loadAdminStaffAndCommittee() {
    if (!currentPanchayatId) return;
    const committeeContainer = document.getElementById("admin-committee-list");
    const staffContainer = document.getElementById("admin-staff-list");

    if (committeeContainer) {
        const committeeSnap = await getDocs(collection(db, "panchayats", currentPanchayatId, "panchayat_committee"));
        committeeContainer.innerHTML = "";
        if (committeeSnap.empty) {
            committeeContainer.innerHTML = "<p class='text-xs text-gray-500'>કોઈ કમિટી સભ્ય મળેલો નથી.</p>";
        } else {
            committeeSnap.forEach(docSnap => {
                const item = docSnap.data();
                committeeContainer.innerHTML += `
                    <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs mb-1">
                        <div class="truncate mr-2">
                            <span class="font-bold text-gray-800">${item.name}</span> (${item.designation})
                            <br><span class="text-[10px] text-gray-500">વોર્ડ: ${item.ward || '-'} | મો: ${item.mobile}</span>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <button data-id="${docSnap.id}" data-col="panchayat_committee" class="edit-ms-btn bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded">એડિટ</button>
                            <button data-id="${docSnap.id}" data-col="panchayat_committee" class="delete-ms-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded">ડિલીટ</button>
                        </div>
                    </div>
                `;
            });
        }
    }

    if (staffContainer) {
        const staffSnap = await getDocs(collection(db, "panchayats", currentPanchayatId, "panchayat_staff"));
        staffContainer.innerHTML = "";
        if (staffSnap.empty) {
            staffContainer.innerHTML = "<p class='text-xs text-gray-500'>કોઈ સ્ટાફ મળેલો નથી.</p>";
        } else {
            staffSnap.forEach(docSnap => {
                const item = docSnap.data();
                staffContainer.innerHTML += `
                    <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs mb-1">
                        <div class="truncate mr-2">
                            <span class="font-bold text-gray-800">${item.name}</span> (${item.designation})
                            <br><span class="text-[10px] text-gray-500">મો: ${item.mobile}</span>
                        </div>
                        <div class="flex items-center gap-1 flex-shrink-0">
                            <button data-id="${docSnap.id}" data-col="panchayat_staff" class="edit-ms-btn bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded">એડિટ</button>
                            <button data-id="${docSnap.id}" data-col="panchayat_staff" class="delete-ms-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded">ડિલીટ</button>
                        </div>
                    </div>
                `;
            });
        }
    }

    document.querySelectorAll(".delete-ms-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const col = e.target.getAttribute("data-col");
            if (confirm("શું તમે આ સભ્ય/કર્મચારીને કાઢી નાખવા માંગો છો?")) {
                await deleteDoc(doc(db, "panchayats", currentPanchayatId, col, id));
                alert("સફળતાપૂર્વક ડિલીટ થઈ ગયું છે.");
                loadAdminStaffAndCommittee();
            }
        });
    });
}

document.getElementById("add-member-staff-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("ms-category").value;
    const targetCol = type === 'committee' ? 'panchayat_committee' : 'panchayat_staff';
    const editId = document.getElementById("edit-ms-id")?.value;

    const payload = {
        name: document.getElementById("ms-name").value,
        designation: document.getElementById("ms-desig").value,
        mobile: document.getElementById("ms-mobile").value,
        ward: document.getElementById("ms-ward").value || '',
        order: Date.now()
    };

    if (editId) {
        await setDoc(doc(db, "panchayats", currentPanchayatId, targetCol, editId), payload, { merge: true });
        alert("વિગત સફળતાપૂર્વક અપડેટ થઈ ગઈ છે!");
    } else {
        await addDoc(collection(db, "panchayats", currentPanchayatId, targetCol), payload);
        alert("સફળતાપૂર્વક ઉમેરાઈ ગયું!");
    }

    e.target.reset();
    loadAdminStaffAndCommittee();
});

// ૯. સમય પત્રક
async function loadAdminSchedule() {
    const container = document.getElementById("admin-schedule-list");
    if (!container || !currentPanchayatId) return;

    try {
        const snap = await getDocs(collection(db, "panchayats", currentPanchayatId, "panchayat_schedule"));
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p class='text-xs text-gray-500'>કોઈ સમય પત્રક ઉમેરાયેલ નથી.</p>";
            return;
        }

        snap.forEach(docSnap => {
            const item = docSnap.data();
            container.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border border-blue-100 rounded shadow-sm text-xs mb-2">
                    <div class="space-y-0.5">
                        <div class="font-bold text-gray-800">${item.name} <span class="text-blue-700">(${item.designation})</span></div>
                        <div class="text-[11px] text-gray-600"><b>સમય:</b> ${item.timing} | <b>દિવસો:</b> ${item.days}</div>
                        ${item.note ? `<div class="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-block"><b>નોંધ:</b> ${item.note}</div>` : ''}
                    </div>
                    <div class="flex items-center gap-1 flex-shrink-0">
                        <button data-id="${docSnap.id}" class="delete-sch-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded">ડિલીટ</button>
                    </div>
                </div>
            `;
        });

        document.querySelectorAll(".delete-sch-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.getAttribute("data-id");
                if (confirm("શું તમે આ સમય પત્રક ડિલીટ કરવા માંગો છો?")) {
                    await deleteDoc(doc(db, "panchayats", currentPanchayatId, "panchayat_schedule", id));
                    alert("સમય પત્રક સફળતાપૂર્વક ડિલીટ થઈ ગયું!");
                    loadAdminSchedule();
                }
            });
        });

    } catch (err) {
        console.error("સમય પત્રક લોડ કરવામાં ભૂલ:", err);
    }
}

document.getElementById("add-schedule-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById("sch-name").value,
        designation: document.getElementById("sch-desig").value,
        timing: document.getElementById("sch-timing").value,
        days: document.getElementById("sch-days").value,
        note: document.getElementById("sch-note").value || '',
        order: Date.now()
    };

    try {
        await addDoc(collection(db, "panchayats", currentPanchayatId, "panchayat_schedule"), payload);
        alert("સમય પત્રક સફળતાપૂર્વક ઉમેરાઈ ગયું!");
        e.target.reset();
        loadAdminSchedule();
    } catch (error) {
        alert("સેવ કરવામાં ભૂલ આવી: " + error.message);
    }
});

// ૧૦. કાર્યરત સમિતિઓ
let committeesCache = {};

function createMemberRowHtml(name = '', mainRole = '', commRole = '') {
    return `
        <div class="member-row flex items-center gap-2 border p-2 rounded bg-gray-50">
            <input type="text" placeholder="સભ્યનું નામ" value="${name}" class="member-name w-1/3 border p-1.5 rounded text-xs" required>
            <input type="text" placeholder="મૂળ હોદ્દો" value="${mainRole}" class="member-main-role w-1/3 border p-1.5 rounded text-xs" required>
            <input type="text" placeholder="સમિતિ હોદ્દો" value="${commRole}" class="member-comm-role w-1/3 border p-1.5 rounded text-xs" required>
            <button type="button" class="remove-member-btn text-red-500 hover:text-red-700 font-bold px-1 text-sm">&times;</button>
        </div>
    `;
}

document.getElementById('add-member-row-btn')?.addEventListener('click', () => {
    const container = document.getElementById('committee-members-container');
    container.insertAdjacentHTML('beforeend', createMemberRowHtml());
});

document.getElementById('committee-members-container')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-member-btn')) {
        const rows = document.querySelectorAll('.member-row');
        if (rows.length > 1) {
            e.target.closest('.member-row').remove();
        } else {
            alert('ઓછામાં ઓછો એક સભ્ય ઉમેરવો જરૂરી છે.');
        }
    }
});

function resetCommitteeForm() {
    const form = document.getElementById('add-committee-group-form');
    if (!form) return;
    form.reset();
    document.getElementById('edit-committee-id').value = "";
    document.getElementById('submit-comm-btn').textContent = "સમિતિ સાચવો";
    document.getElementById('cancel-comm-edit-btn').classList.add('hidden');
    document.getElementById('committee-members-container').innerHTML = createMemberRowHtml();
}

document.getElementById('cancel-comm-edit-btn')?.addEventListener('click', resetCommitteeForm);

document.getElementById("add-committee-group-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-committee-id").value;
    const title = document.getElementById("cg-title").value.trim();

    const memberRows = document.querySelectorAll('.member-row');
    const members = [];

    memberRows.forEach(row => {
        const name = row.querySelector('.member-name').value.trim();
        const originalDesignation = row.querySelector('.member-main-role').value.trim();
        const committeeRole = row.querySelector('.member-comm-role').value.trim();
        if (name) members.push({ name, originalDesignation, committeeRole });
    });

    try {
        if (editId) {
            await updateDoc(doc(db, "panchayats", currentPanchayatId, "active_committees", editId), {
                committeeName: title, members, updatedAt: new Date()
            });
            alert("સમિતિ સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
        } else {
            await addDoc(collection(db, "panchayats", currentPanchayatId, "active_committees"), {
                committeeName: title, members, createdAt: new Date()
            });
            alert("નવી સમિતિ સફળતાપૂર્વક ઉમેરાઈ ગઈ!");
        }
        resetCommitteeForm();
    } catch (error) {
        console.error("Error saving committee:", error);
        alert("સાચવવામાં ભૂલ આવી, ફરી પ્રયત્ન કરો.");
    }
});

function loadActiveCommittees() {
    const container = document.getElementById("admin-committees-list");
    if (!container || !currentPanchayatId) return;

    onSnapshot(collection(db, "panchayats", currentPanchayatId, "active_committees"), (snapshot) => {
        container.innerHTML = "";
        committeesCache = {};

        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500">કોઈ સમિતિ મળેલી નથી.</p>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            committeesCache[id] = data;

            let membersHtml = "";
            if (Array.isArray(data.members)) {
                membersHtml = data.members.map(m => `<li>• <b>${m.name || ''}</b> (${m.originalDesignation || ''}) - <i>${m.committeeRole || ''}</i></li>`).join("");
            }

            const card = document.createElement("div");
            card.className = "bg-gray-50 border p-3 rounded-lg space-y-1.5 text-xs mb-2";
            card.innerHTML = `
                <div class="flex justify-between items-center border-b pb-1">
                    <h4 class="font-bold text-emerald-800 text-sm">${data.committeeName || ''}</h4>
                    <div class="flex gap-2">
                        <button onclick="editCommittee('${id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-bold">એડિટ</button>
                        <button onclick="deleteCommittee('${id}')" class="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold">ડિલીટ</button>
                    </div>
                </div>
                <ul class="text-gray-700 space-y-0.5 text-[11px] mt-1">${membersHtml}</ul>
            `;
            container.appendChild(card);
        });
    });
}

window.editCommittee = (id) => {
    const data = committeesCache[id];
    if (!data) return;
    document.getElementById('edit-committee-id').value = id;
    document.getElementById('cg-title').value = data.committeeName || "";
    const container = document.getElementById('committee-members-container');
    container.innerHTML = "";
    if (Array.isArray(data.members)) {
        data.members.forEach(m => container.insertAdjacentHTML('beforeend', createMemberRowHtml(m.name, m.originalDesignation, m.committeeRole)));
    }
    document.getElementById('submit-comm-btn').textContent = "અપડેટ કરો";
    document.getElementById('cancel-comm-edit-btn').classList.remove('hidden');
    document.getElementById('add-committee-group-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteCommittee = async (id) => {
    if (confirm("શું તમે આ સમિતિ ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(doc(db, "panchayats", currentPanchayatId, "active_committees", id));
            alert("સમિતિ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!");
            if (document.getElementById('edit-committee-id').value === id) resetCommitteeForm();
        } catch (err) {
            console.error("Delete error:", err);
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

// ૧૧. મિલકત વેરા લિંક
async function loadAdminTaxLink() {
    if (!currentPanchayatId) return;
    try {
        const docSnap = await getDoc(doc(db, "panchayats", currentPanchayatId, "settings", "tax_payment"));
        if (docSnap.exists()) {
            document.getElementById("tax-payment-url").value = docSnap.data().url || "";
        }
    } catch (err) {
        console.error("Tax link load error:", err);
    }
}

document.getElementById("tax-link-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const urlValue = document.getElementById("tax-payment-url").value;

    try {
        await setDoc(doc(db, "panchayats", currentPanchayatId, "settings", "tax_payment"), {
            url: urlValue, updatedAt: Date.now()
        }, { merge: true });

        alert("મિલકત વેરાની લિંક સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
    } catch (err) {
        alert("લિંક સેવ કરવામાં ભૂલ આવી: " + err.message);
    }
});

// ૧૨. કસ્ટમ બટન્સ
async function loadAdminCustomButtons() {
    if (!currentPanchayatId) return;
    const listDiv = document.getElementById("admin-custom-buttons-list");
    if (!listDiv) return;

    try {
        const snap = await getDocs(collection(db, "panchayats", currentPanchayatId, "custom_pages"));
        listDiv.innerHTML = "";

        if (snap.empty) {
            listDiv.innerHTML = "<p class='text-xs text-gray-400'>કોઈ કસ્ટમ બટન ઉમેરાયેલ નથી.</p>";
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            listDiv.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs mb-1">
                    <span class="font-bold text-gray-800">${data.buttonTitle}</span>
                    <button data-id="${docSnap.id}" class="delete-page-btn bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px]">ડિલીટ</button>
                </div>
            `;
        });

        document.querySelectorAll(".delete-page-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.getAttribute("data-id");
                if (confirm("શું તમે આ બટન ડિલીટ કરવા માંગો છો?")) {
                    await deleteDoc(doc(db, "panchayats", currentPanchayatId, "custom_pages", id));
                    alert("બટન સફળતાપૂર્વક ડિલીટ થઈ ગયું!");
                    loadAdminCustomButtons();
                }
            });
        });

    } catch (err) {
        console.error("બટન લોડ કરવામાં ભૂલ:", err);
    }
}

document.getElementById("add-page-button-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("custom-btn-title").value;
    const htmlContent = document.getElementById("custom-page-html").value;

    try {
        await addDoc(collection(db, "panchayats", currentPanchayatId, "custom_pages"), {
            buttonTitle: title, htmlContent, createdAt: Date.now()
        });
        alert("નવું બટન અને પેજ સફળતાપૂર્વક ઉમેરાઈ ગયું!");
        e.target.reset();
        loadAdminCustomButtons();
    } catch (err) {
        alert("સેવ કરવામાં ભૂલ આવી: " + err.message);
    }
});

// ૧૩. ઇવેન્ટ્સ મેનેજર
async function loadAdminEvents() {
    if (!currentPanchayatId) return;
    const listDiv = document.getElementById("admin-events-list");
    if (!listDiv) return;

    try {
        const snap = await getDocs(collection(db, "panchayats", currentPanchayatId, "events"));
        listDiv.innerHTML = "";

        if (snap.empty) {
            listDiv.innerHTML = "<p class='text-xs text-gray-400'>કોઈ ઇવેન્ટ ઉમેરાયેલ નથી.</p>";
            return;
        }

        snap.forEach(docSnap => {
            const data = docSnap.data();
            listDiv.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs mb-1">
                    <div>
                        <p class="font-bold text-gray-800">${data.eventName}</p>
                        <p class="text-[10px] text-gray-500">📅 ${data.eventDate} | 📍 ${data.eventLocation}</p>
                    </div>
                    <button data-id="${docSnap.id}" class="delete-event-btn bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px]">ડિલીટ</button>
                </div>
            `;
        });

        document.querySelectorAll(".delete-event-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.getAttribute("data-id");
                if (confirm("શું તમે આ ઇવેન્ટ ડિલીટ કરવા માંગો છો?")) {
                    await deleteDoc(doc(db, "panchayats", currentPanchayatId, "events", id));
                    alert("ઇવેન્ટ સફળતાપૂર્વક ડિલીટ થઈ ગઈ!");
                    loadAdminEvents();
                }
            });
        });

    } catch (err) {
        console.error("ઇવેન્ટ્સ લોડમાં ભૂલ:", err);
    }
}

document.getElementById("event-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("event-name").value;
    const date = document.getElementById("event-date").value;
    const location = document.getElementById("event-location").value;

    try {
        await addDoc(collection(db, "panchayats", currentPanchayatId, "events"), {
            eventName: name, eventDate: date, eventLocation: location, createdAt: Date.now()
        });
        alert("નવી ઇવેન્ટ સફળતાપૂર્વક ઉમેરાઈ ગઈ!");
        e.target.reset();
        loadAdminEvents();
    } catch (err) {
        alert("સેવ કરવામાં ભૂલ આવી: " + err.message);
    }
});

// ૧૪. આપત્તિ વ્યવસ્થાપન
const disasterSelect = document.getElementById('disaster-page-key');
const disasterTextarea = document.getElementById('disaster-page-content');
const disasterForm = document.getElementById('disaster-management-form');

if (disasterForm && disasterSelect && disasterTextarea) {
    async function fetchDisasterContent() {
        if (!currentPanchayatId) return;
        const key = disasterSelect.value;
        disasterTextarea.value = "લોડ થઈ રહ્યું છે...";
        try {
            const docSnap = await getDoc(doc(db, "panchayats", currentPanchayatId, "disaster_management", key));
            disasterTextarea.value = docSnap.exists() ? docSnap.data().content || '' : '';
        } catch (error) {
            console.error("ડેટા મેળવવામાં ભૂલ:", error);
            disasterTextarea.value = '';
        }
    }

    disasterSelect.addEventListener('change', fetchDisasterContent);

    disasterForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const key = disasterSelect.value;
        const content = disasterTextarea.value;
        try {
            await setDoc(doc(db, "panchayats", currentPanchayatId, "disaster_management", key), {
                content, updatedAt: new Date()
            }, { merge: true });

            alert('✅ માહિતી સફળતાપૂર્વક અપડેટ થઈ ગઈ!');
        } catch (error) {
            alert('❌ માહિતી સેવ કરવામાં સમસ્યા આવી!');
        }
    });
}

// ૧૫. નક્શાની લિંક્સ
const mapForm = document.getElementById('village-map-form');
if (mapForm) {
    mapForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const satUrl = document.getElementById('admin-satellite-url').value.trim();
        const pdfUrl = document.getElementById('admin-revenue-pdf-url').value.trim();

        try {
            await setDoc(doc(db, "panchayats", currentPanchayatId, "village_map_settings", "links"), {
                satelliteUrl: satUrl, revenuePdfUrl: pdfUrl, updatedAt: new Date()
            }, { merge: true });

            alert("✅ નક્શાની લિંક્સ સફળતાપૂર્વક સાચવવામાં આવી!");
        } catch (err) {
            alert("❌ સેવ ન થઈ શક્યું: " + err.message);
        }
    });
}

// ૧૬. મારૂ ગામ - એક નજરમાં
let glanceCache = {};

function resetGlanceForm() {
    const form = document.getElementById('add-glance-form');
    if (!form) return;
    form.reset();
    document.getElementById('edit-glance-id').value = "";
    document.getElementById('submit-glance-btn').textContent = "માહિતી સાચવો";
    document.getElementById('cancel-glance-edit-btn').classList.add('hidden');
}

document.getElementById('cancel-glance-edit-btn')?.addEventListener('click', resetGlanceForm);

document.getElementById("add-glance-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-glance-id").value;
    const sectionName = document.getElementById("glance-section").value;
    const title = document.getElementById("glance-title").value.trim();
    const value = document.getElementById("glance-value").value.trim();
    const extraInfo = document.getElementById("glance-extra").value.trim();

    try {
        if (editId) {
            await updateDoc(doc(db, "panchayats", currentPanchayatId, "village_glance", editId), {
                sectionName, title, value, extraInfo, updatedAt: new Date()
            });
            alert("માહિતી સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
        } else {
            await addDoc(collection(db, "panchayats", currentPanchayatId, "village_glance"), {
                sectionName, title, value, extraInfo, createdAt: new Date()
            });
            alert("માહિતી સફળતાપૂર્વક ઉમેરાઈ ગઈ!");
        }
        resetGlanceForm();
    } catch (error) {
        alert("સાચવવામાં ભૂલ આવી.");
    }
});

function loadAdminGlanceList() {
    const container = document.getElementById("admin-glance-list");
    if (!container || !currentPanchayatId) return;

    onSnapshot(collection(db, "panchayats", currentPanchayatId, "village_glance"), (snapshot) => {
        container.innerHTML = "";
        glanceCache = {};

        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">કોઈ માહિતી ઉપલબ્ધ નથી.</p>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            glanceCache[id] = data;

            container.innerHTML += `
                <div class="bg-gray-50 border p-3 rounded-lg flex justify-between items-center text-xs mb-2">
                    <div>
                        <span class="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded font-bold">${data.sectionName}</span>
                        <h5 class="font-bold text-gray-800 text-sm mt-1">${data.title}: <span class="text-emerald-700">${data.value}</span></h5>
                    </div>
                    <div class="flex gap-1.5 shrink-0">
                        <button type="button" onclick="deleteGlance('${id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold">ડિલીટ</button>
                    </div>
                </div>
            `;
        });
    });
}

window.deleteGlance = async (id) => {
    if (confirm("શું તમે આ માહિતી ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(doc(db, "panchayats", currentPanchayatId, "village_glance", id));
            alert("માહિતી સફળતાપૂર્વક ડિલીટ થઈ ગઈ!");
        } catch (err) {
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

// ૧૭. સંપર્ક વિગત
async function loadContactAdminData() {
    if (!currentPanchayatId) return;
    try {
        const docSnap = await getDoc(doc(db, "panchayats", currentPanchayatId, "contact_info", "main_contact"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("adm-panchayat-name").value = data.panchayatName || "";
            document.getElementById("adm-address").value = data.address || "";
            document.getElementById("adm-email").value = data.email || "";
            document.getElementById("adm-phone").value = data.phone || "";
            document.getElementById("adm-extra").value = data.extraInfo || "";
        }
    } catch (err) {
        console.error("Error loading contact info:", err);
    }
}

document.getElementById("contact-admin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, "panchayats", currentPanchayatId, "contact_info", "main_contact"), {
            panchayatName: document.getElementById("adm-panchayat-name").value.trim(),
            address: document.getElementById("adm-address").value.trim(),
            email: document.getElementById("adm-email").value.trim(),
            phone: document.getElementById("adm-phone").value.trim(),
            extraInfo: document.getElementById("adm-extra").value.trim(),
            updatedAt: new Date()
        }, { merge: true });

        alert("સંપર્ક વિગતો સફળતાપૂર્વક સાચવાઈ ગઈ!");
    } catch (err) {
        alert("સાચવવામાં ભૂલ આવી.");
    }
});

// ૧૮. ફીડબેક્સ
function loadAdminFeedbacks() {
    const container = document.getElementById("admin-feedback-list");
    if (!container || !currentPanchayatId) return;

    const q = query(collection(db, "panchayats", currentPanchayatId, "user_feedbacks"), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">હાલમાં કોઈ નવો પ્રતિસાદ મળ્યો નથી.</p>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            let dateStr = data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString('gu-IN') : 'N/A';

            const card = document.createElement("div");
            card.className = "bg-gray-50 border p-3 rounded-xl space-y-2 text-xs shadow-sm mb-2";
            card.innerHTML = `
                <div class="flex justify-between items-start border-b pb-1.5">
                    <div>
                        <h4 class="font-bold text-gray-900 text-sm"><i class="fa-solid fa-user text-emerald-600 text-xs"></i> ${data.name || 'અનામી'}</h4>
                        <a href="tel:${data.phone}" class="text-blue-600 font-semibold text-[11px]"><i class="fa-solid fa-phone text-[10px]"></i> ${data.phone || 'નંબર નથી'}</a>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded border">${dateStr}</span>
                        <button onclick="deleteFeedback('${id}')" class="block mt-1 ml-auto bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">ડિલીટ</button>
                    </div>
                </div>
                <p class="text-gray-700 bg-white p-2.5 rounded border border-gray-200 whitespace-pre-line">${data.message || ''}</p>
            `;
            container.appendChild(card);
        });
    });
}

window.deleteFeedback = async (id) => {
    if (confirm("શું તમે આ પ્રતિસાદ ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(doc(db, "panchayats", currentPanchayatId, "user_feedbacks", id));
            alert("પ્રતિસાદ સફળતાપૂર્વક ડિલીટ થઈ ગયો!");
        } catch (err) {
            alert("ડિલીટ કરવામાં ભૂલ આવી.");
        }
    }
};

// ૧૯. સ્વયં જાહેર કરેલ માહિતી
window.addPopulationRow = (val = {}) => {
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center bg-white p-2 rounded border";
    div.innerHTML = `
        <input type="text" placeholder="વિગત (દા.ત. કુલ વસ્તી)" class="pop-title border p-1 rounded w-1/3 text-xs" value="${val.title || ''}">
        <input type="number" placeholder="સ્ત્રી" class="pop-female border p-1 rounded w-1/5 text-xs" value="${val.female || ''}">
        <input type="number" placeholder="પુરુષ" class="pop-male border p-1 rounded w-1/5 text-xs" value="${val.male || ''}">
        <input type="number" placeholder="કુલ" class="pop-total border p-1 rounded w-1/5 text-xs" value="${val.total || ''}">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 font-bold px-2">✕</button>
    `;
    document.getElementById("population-rows").appendChild(div);
};

window.addWaterRow = (val = {}) => {
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center bg-white p-2 rounded border";
    div.innerHTML = `
        <input type="text" placeholder="જળાશય નામ" class="wat-source border p-1 rounded w-1/4 text-xs" value="${val.source || ''}">
        <input type="number" placeholder="સંખ્યા" class="wat-count border p-1 rounded w-1/4 text-xs" value="${val.count || ''}">
        <input type="text" placeholder="વિસ્તાર" class="wat-area border p-1 rounded w-1/4 text-xs" value="${val.area || ''}">
        <input type="text" placeholder="ક્ષમતા" class="wat-cap border p-1 rounded w-1/4 text-xs" value="${val.capacity || ''}">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 font-bold px-2">✕</button>
    `;
    document.getElementById("water-rows").appendChild(div);
};

window.addPropRow = (val = {}) => {
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center bg-white p-2 rounded border";
    div.innerHTML = `
        <input type="text" placeholder="મિલકત નામ" class="prop-name border p-1 rounded w-1/3 text-xs" value="${val.name || ''}">
        <input type="number" placeholder="સંખ્યા" class="prop-count border p-1 rounded w-1/4 text-xs" value="${val.count || ''}">
        <input type="text" placeholder="અન્ય વિગત" class="prop-detail border p-1 rounded w-1/3 text-xs" value="${val.detail || ''}">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-500 font-bold px-2">✕</button>
    `;
    document.getElementById("prop-rows").appendChild(div);
};

async function loadAdminData() {
    if (!currentPanchayatId) return;
    try {
        const snap = await getDoc(doc(db, "panchayats", currentPanchayatId, "proactive_disclosure", "main_data"));
        if (snap.exists()) {
            const data = snap.data();
            if (data.officer) {
                document.getElementById("off-name").value = data.officer.name || "";
                document.getElementById("off-phone").value = data.officer.phone || "";
                document.getElementById("off-appeal").value = data.officer.appealOfficer || "";
            }
            if (data.extraTitle) document.getElementById("extra-title-input").value = data.extraTitle;
            if (data.extraContent) document.getElementById("extra-content-input").value = data.extraContent;

            if (data.population) data.population.forEach(item => addPopulationRow(item));
            if (data.water) data.water.forEach(item => addWaterRow(item));
            if (data.property) data.property.forEach(item => addPropRow(item));
        }
    } catch (err) {
        console.error("Error loading admin data:", err);
    }
}

document.getElementById("proactive-admin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const officer = {
            name: document.getElementById("off-name").value.trim(),
            phone: document.getElementById("off-phone").value.trim(),
            appealOfficer: document.getElementById("off-appeal").value.trim()
        };

        const population = Array.from(document.querySelectorAll("#population-rows > div")).map(row => ({
            title: row.querySelector(".pop-title").value,
            female: row.querySelector(".pop-female").value,
            male: row.querySelector(".pop-male").value,
            total: row.querySelector(".pop-total").value
        }));

        const water = Array.from(document.querySelectorAll("#water-rows > div")).map(row => ({
            source: row.querySelector(".wat-source").value,
            count: row.querySelector(".wat-count").value,
            area: row.querySelector(".wat-area").value,
            capacity: row.querySelector(".wat-cap").value
        }));

        const property = Array.from(document.querySelectorAll("#prop-rows > div")).map(row => ({
            name: row.querySelector(".prop-name").value,
            count: row.querySelector(".prop-count").value,
            detail: row.querySelector(".prop-detail").value
        }));

        await setDoc(doc(db, "panchayats", currentPanchayatId, "proactive_disclosure", "main_data"), {
            officer,
            extraTitle: document.getElementById("extra-title-input").value.trim(),
            extraContent: document.getElementById("extra-content-input").value.trim(),
            population, water, property, updatedAt: new Date()
        });

        alert("માહિતી સફળતાપૂર્વક સેવ/અપડેટ થઈ ગઈ!");
    } catch (err) {
        alert("સેવ કરવામાં ભૂલ આવી.");
    }
});

// ઓથોન્ટિકેશન શરૂ કરવું
initAdminAuth();
