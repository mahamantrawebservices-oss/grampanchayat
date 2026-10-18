import { db, storage, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, onSnapshot, addDoc, updateDoc, getDocs, doc, setDoc, getDoc, deleteDoc, query, orderBy, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// URL માંથી પંચાયત આઈડી મેળવવું
const urlParams = new URLSearchParams(window.location.search);
const panchayatId = urlParams.get('id') || "ahmedabad_daskroi_motapipalva";

// 🔒 1. Global Maintenance & Active/Deactive Guard Check for Admin
async function checkAdminSystemAccess() {
    try {
        const maintSnap = await getDoc(doc(db, "system_settings", "global_config"));
        if (maintSnap.exists() && maintSnap.data().isMaintenance) {
            document.body.innerHTML = `
                <div class="fixed inset-0 bg-slate-900 text-white z-50 flex flex-col items-center justify-center p-6 text-center">
                    <div class="bg-slate-800 p-8 rounded-3xl border border-slate-700 max-w-lg shadow-2xl space-y-4">
                        <h2 class="text-2xl font-bold text-amber-400">સિસ્ટમ મેન્ટેનન્સ ચાલુ છે</h2>
                        <p class="text-gray-300 text-sm">હાલમાં સિસ્ટમ અપડેટ હેઠળ છે.</p>
                    </div>
                </div>`;
            return false;
        }

        const pSnap = await getDoc(doc(db, "panchayats", panchayatId));
        if (pSnap.exists() && pSnap.data().isActive === false) {
            document.body.innerHTML = `
                <div class="fixed inset-0 bg-gray-900/90 text-white z-40 flex flex-col items-center justify-center p-6 text-center">
                    <div class="bg-white text-gray-800 p-8 rounded-3xl max-w-md shadow-2xl space-y-4">
                        <h2 class="text-xl font-bold text-red-600">સબ્સ્ક્રિપ્શન નિષ્ક્રિય છે (Deactive)</h2>
                        <p class="text-gray-600 text-sm">આ ગ્રામ પંચાયતનું સબ્સ્ક્રિપ્શન એક્ટિવ નથી.</p>
                    </div>
                </div>`;
            return false;
        }
    } catch (err) {
        console.error("Admin Access Check Error:", err);
    }
    return true;
}

// Check Authentication
onAuthStateChanged(auth, async (user) => {
    const isAllowed = await checkAdminSystemAccess();
    if (!isAllowed) return;

    if (user) {
        document.getElementById("login-modal")?.classList.add("hidden");
        document.getElementById("admin-dashboard")?.classList.remove("hidden");
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
        loadAdminGlanceList();
        loadContactAdminData();
        loadAdminFeedbacks();
        loadAdminData();
    } else {
        document.getElementById("login-modal")?.classList.remove("hidden");
        document.getElementById("admin-dashboard")?.classList.add("hidden");
    }
});

// Admin Login
document.getElementById("admin-login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value;
    const pass = document.getElementById("login-password")?.value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("લોગિન નિષ્ફળ: " + err.message));
});

// Logout
document.getElementById("logout-btn")?.addEventListener("click", () => signOut(auth));

// Save Customization
document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("set-gp-name")?.value;
    const tagline = document.getElementById("set-gp-tagline")?.value;

    await setDoc(doc(db, "panchayats", panchayatId, "settings", "general"), {
        ...(name && { name }),
        ...(tagline && { tagline })
    }, { merge: true });

    alert("સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગયા!");
});

// Global Cache object for Posts
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
            await updateDoc(doc(db, "panchayats", panchayatId, "posts", editId), {
                title: title,
                desc: desc,
                type: 'post',
                updatedAt: new Date()
            });
            alert("પોસ્ટ સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
        } else {
            await addDoc(collection(db, "panchayats", panchayatId, "posts"), {
                title: title,
                desc: desc,
                type: 'post',
                createdAt: new Date()
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
    if (!container) return;

    onSnapshot(collection(db, "panchayats", panchayatId, "posts"), (snapshot) => {
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
    }, (error) => {
        console.error("❌ Firestore Posts Fetch Error:", error);
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
            await deleteDoc(doc(db, "panchayats", panchayatId, "posts", id));
            alert("પોસ્ટ ડિલીટ થઈ ગઈ!");
            if (document.getElementById('edit-post-id').value === id) {
                resetPostForm();
            }
        } catch (err) {
            console.error("Delete error:", err);
        }
    }
};

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
            await updateDoc(doc(db, "panchayats", panchayatId, "notices", editId), {
                title: title,
                desc: desc,
                updatedAt: new Date()
            });
            alert("નોટિસ સફળતાપૂર્વક અપડેટ થઈ ગઈ!");
        } else {
            await addDoc(collection(db, "panchayats", panchayatId, "notices"), {
                title: title,
                desc: desc,
                createdAt: new Date()
            });
            alert("નવી નોટિસ સફળતાપૂર્વક સાચવાઈ ગઈ!");
        }

        resetNoticeForm();
    } catch (error) {
        console.error("Error saving notice:", error);
    }
});

function loadNotices() {
    const container = document.getElementById("admin-notices-list");
    if (!container) return;

    onSnapshot(collection(db, "panchayats", panchayatId, "notices"), (snapshot) => {
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

            const title = data.title || data.noticeTitle || data.subject || data.heading || "અનામી પોસ્ટ / નોટિસ";
            const desc = data.desc || data.description || data.details || data.message || data.content || "";
            
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
    document.getElementById('notice-title').value = data.title || data.noticeTitle || data.subject || "";
    document.getElementById('notice-desc').value = data.desc || data.description || data.details || "";

    document.getElementById('submit-notice-btn').textContent = "અપડેટ કરો";
    document.getElementById('cancel-notice-edit-btn').classList.remove('hidden');

    document.getElementById('add-notice-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteNotice = async (id) => {
    if (confirm("શું તમે ખરેખર આ નોટિસ ડિલીટ કરવા માંગો છો?")) {
        try {
            await deleteDoc(doc(db, "panchayats", panchayatId, "notices", id));
            alert("નોટિસ ડિલીટ થઈ ગઈ!");
            if (document.getElementById('edit-notice-id').value === id) {
                resetNoticeForm();
            }
        } catch (err) {
            console.error("Delete error:", err);
        }
    }
};

document.getElementById("gallery-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("img-title").value;
    const url = document.getElementById("img-url").value;

    await addDoc(collection(db, "panchayats", panchayatId, "gallery"), {
        title: title,
        imageUrl: url,
        createdAt: new Date()
    });

    alert("ફોટો ગેલેરીમાં ઉમેરાઈ ગયો!");
    e.target.reset();
    loadAdminGallery();
});

async function loadAdminGallery() {
    const snap = await getDocs(collection(db, "panchayats", panchayatId, "gallery"));
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
                <button data-id="${id}" class="delete-gallery-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded transition flex-shrink-0">ડિલીટ</button>
            </div>
        `;
    });

    document.querySelectorAll(".delete-gallery-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const docId = e.target.getAttribute("data-id");
            if (confirm("શું તમે આ ફોટો ગેલેરીમાંથી કાઢી નાખવા માંગો છો?")) {
                await deleteDoc(doc(db, "panchayats", panchayatId, "gallery", docId));
                alert("ફોટો ડિલીટ થઈ ગયો છે.");
                loadAdminGallery();
            }
        });
    });
}

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
            await setDoc(doc(db, "panchayats", panchayatId, "village_details", editId), {
                title: title,
                content: content,
                updatedAt: new Date()
            }, { merge: true });
            alert("મેનૂ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
        } else {
            await addDoc(collection(db, "panchayats", panchayatId, "village_details"), {
                title: title,
                content: content,
                isShow: true,
                createdAt: new Date()
            });
            alert("નવું મેનૂ સફળતાપૂર્વક ઉમેરાઈ ગયું!");
        }

        resetMenuForm();
        loadAdminMenuList();
    } catch (err) {
        console.error("Error saving village menu:", err);
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
    if (!container) return;

    try {
        container.innerHTML = "<p class='text-xs text-gray-500'>મેનૂ લોડ થઈ રહ્યા છે...</p>";
        const querySnapshot = await getDocs(collection(db, "panchayats", panchayatId, "village_details"));
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
                        <button type="button" data-id="${id}" data-status="${isShow}" class="toggle-show-btn text-[10px] px-2 py-1 rounded text-white ${isShow ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-500 hover:bg-gray-600'} font-bold">${isShow ? 'સંતાડો' : 'બતાવો'}</button>
                        <button type="button" data-id="${id}" class="delete-menu-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded font-bold">ડિલીટ</button>
                    </div>
                </div>
            `;
        });

        attachMenuEventListeners();
    } catch (err) {
        console.error("❌ Menu Load Error:", err);
    }
}

function attachMenuEventListeners() {
    document.querySelectorAll(".edit-menu-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            try {
                const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "village_details", id));
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
                await setDoc(doc(db, "panchayats", panchayatId, "village_details", id), { isShow: !currentStatus }, { merge: true });
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
                    await deleteDoc(doc(db, "panchayats", panchayatId, "village_details", id));
                    loadAdminMenuList();
                } catch (err) {
                    console.error("Error deleting menu:", err);
                }
            }
        });
    });
}

function formatDateTime(timestamp) {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('gu-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
}

async function loadAdminComplaints() {
    const filter = document.getElementById("admin-complaint-filter")?.value || "ALL";
    const snap = await getDocs(collection(db, "panchayats", panchayatId, "complaints"));
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
                        <option value="ફરિયાદ દફતરે કરવામાં આવેલ છે">ફરિયાદ દફતરે કરવામાં આવેલ છે</option>
                        <option value="ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે">ફરિયાદ પેન્ડિંગ રાખવામા આવેલ છે</option>
                    </select>
                </div>
            </div>
        `;
    });

    document.querySelectorAll(".update-status-select").forEach(sel => {
        sel.addEventListener("change", async (e) => {
            const id = e.target.getAttribute("data-id");
            await setDoc(doc(db, "panchayats", panchayatId, "complaints", id), { status: e.target.value }, { merge: true });
            alert("સ્ટેટસ અપડેટ થઈ ગયું!");
            loadAdminComplaints();
        });
    });
}

document.getElementById("admin-complaint-filter")?.addEventListener("change", loadAdminComplaints);

async function loadAdminMeta() {
    try {
        const snap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "staff_page_meta"));
        if (snap.exists()) {
            const data = snap.data();
            if (document.getElementById("admin-term-input")) {
                document.getElementById("admin-term-input").value = data.term || "";
            }
            if (document.getElementById("admin-note-input")) {
                document.getElementById("admin-note-input").value = data.note || "";
            }
        }
    } catch (err) {
        console.error("Meta loading error:", err);
    }
}

document.getElementById("save-meta-btn")?.addEventListener("click", async () => {
    const term = document.getElementById("admin-term-input").value;
    const note = document.getElementById("admin-note-input").value;
    await setDoc(doc(db, "panchayats", panchayatId, "settings", "staff_page_meta"), { term, note }, { merge: true });
    alert("મુદત અને નોંધ સાચવી લેવાયેલ છે!");
});

async function loadAdminStaffAndCommittee() {
    const committeeContainer = document.getElementById("admin-committee-list");
    const staffContainer = document.getElementById("admin-staff-list");

    if (committeeContainer) {
        const committeeSnap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_committee"));
        committeeContainer.innerHTML = "";
        if (committeeSnap.empty) {
            committeeContainer.innerHTML = "<p class='text-xs text-gray-500'>કોઈ કમિટી સભ્ય મળેલો નથી.</p>";
        } else {
            committeeSnap.forEach(docSnap => {
                const item = docSnap.data();
                committeeContainer.innerHTML += `
                    <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs">
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
        const staffSnap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_staff"));
        staffContainer.innerHTML = "";
        if (staffSnap.empty) {
            staffContainer.innerHTML = "<p class='text-xs text-gray-500'>કોઈ સ્ટાફ મળેલો નથી.</p>";
        } else {
            staffSnap.forEach(docSnap => {
                const item = docSnap.data();
                staffContainer.innerHTML += `
                    <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs">
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
                await deleteDoc(doc(db, "panchayats", panchayatId, col, id));
                alert("ડિલીટ થઈ ગયું છે.");
                loadAdminStaffAndCommittee();
            }
        });
    });
}

document.getElementById("add-member-staff-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("ms-category").value;
    const targetCol = type === 'committee' ? 'panchayat_committee' : 'panchayat_staff';
    
    const payload = {
        name: document.getElementById("ms-name").value,
        designation: document.getElementById("ms-desig").value,
        mobile: document.getElementById("ms-mobile").value,
        ward: document.getElementById("ms-ward").value || '',
        order: Date.now()
    };

    await addDoc(collection(db, "panchayats", panchayatId, targetCol), payload);
    alert("સફળતાપૂર્વક ઉમેરાઈ ગયું!");
    e.target.reset();
    loadAdminStaffAndCommittee();
});

async function loadAdminSchedule() {
    const container = document.getElementById("admin-schedule-list");
    if (!container) return;

    try {
        const snap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_schedule"));
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p class='text-xs text-gray-500'>કોઈ સમય પત્રક ઉમેરાયેલ નથી.</p>";
            return;
        }

        snap.forEach(docSnap => {
            const item = docSnap.data();
            container.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs mb-2">
                    <div>
                        <div class="font-bold text-gray-800">${item.name} (${item.designation})</div>
                        <div class="text-[11px] text-gray-650">સમય: ${item.timing} | દિવસો: ${item.days}</div>
                    </div>
                    <button data-id="${docSnap.id}" class="delete-sch-btn bg-red-600 text-white text-[10px] px-2 py-1 rounded">ડિલીટ</button>
                </div>
            `;
        });

        document.querySelectorAll(".delete-sch-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const id = e.target.getAttribute("data-id");
                await deleteDoc(doc(db, "panchayats", panchayatId, "panchayat_schedule", id));
                loadAdminSchedule();
            });
        });
    } catch (err) {
        console.error("સમય પત્રક લોડ ભૂલ:", err);
    }
}

document.getElementById("add-schedule-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
        name: document.getElementById("sch-name").value,
        designation: document.getElementById("sch-desig").value,
        timing: document.getElementById("sch-timing").value,
        days: document.getElementById("sch-days").value,
        note: document.getElementById("sch-note").value || ''
    };
    await addDoc(collection(db, "panchayats", panchayatId, "panchayat_schedule"), payload);
    alert("સમય પત્રક ઉમેરાઈ ગયું!");
    e.target.reset();
    loadAdminSchedule();
});

async function loadAdminTaxLink() {
    const inputEl = document.getElementById("tax-payment-url");
    if (!inputEl) return;
    try {
        const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "tax_payment"));
        if (docSnap.exists()) {
            inputEl.value = docSnap.data().url || "";
        }
    } catch (err) {
        console.error("ટેક્સ લિંક લોડ ભૂલ:", err);
    }
}

document.getElementById("tax-link-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const urlValue = document.getElementById("tax-payment-url").value;
    await setDoc(doc(db, "panchayats", panchayatId, "settings", "tax_payment"), { url: urlValue }, { merge: true });
    alert("મિલકત વેરાની લિંક અપડેટ થઈ ગઈ!");
});

async function loadAdminCustomButtons() {
    const listDiv = document.getElementById("admin-custom-buttons-list");
    if (!listDiv) return;
    try {
        const snap = await getDocs(collection(db, "panchayats", panchayatId, "custom_pages"));
        listDiv.innerHTML = "";
        snap.forEach(docSnap => {
            const data = docSnap.data();
            listDiv.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs">
                    <span class="font-bold">${data.buttonTitle}</span>
                    <button data-id="${docSnap.id}" class="delete-page-btn bg-red-600 text-white px-2 py-1 rounded text-[10px]">ડિલીટ</button>
                </div>
            `;
        });
        document.querySelectorAll(".delete-page-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                await deleteDoc(doc(db, "panchayats", panchayatId, "custom_pages", e.target.getAttribute("data-id")));
                loadAdminCustomButtons();
            });
        });
    } catch (err) {
        console.error("કસ્ટમ બટન લોડ ભૂલ:", err);
    }
}

document.getElementById("add-page-button-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "panchayats", panchayatId, "custom_pages"), {
        buttonTitle: document.getElementById("custom-btn-title").value,
        htmlContent: document.getElementById("custom-page-html").value
    });
    alert("બટન ઉમેરાઈ ગયું!");
    e.target.reset();
    loadAdminCustomButtons();
});

async function loadAdminEvents() {
    const listDiv = document.getElementById("admin-events-list");
    if (!listDiv) return;
    try {
        const snap = await getDocs(collection(db, "panchayats", panchayatId, "events"));
        listDiv.innerHTML = "";
        snap.forEach(docSnap => {
            const data = docSnap.data();
            listDiv.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs">
                    <span>${data.eventName} (${data.eventDate})</span>
                    <button data-id="${docSnap.id}" class="delete-event-btn bg-red-600 text-white px-2 py-1 rounded text-[10px]">ડિલીટ</button>
                </div>
            `;
        });
        document.querySelectorAll(".delete-event-btn").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                await deleteDoc(doc(db, "panchayats", panchayatId, "events", e.target.getAttribute("data-id")));
                loadAdminEvents();
            });
        });
    } catch (err) {
        console.error("ઇવેન્ટ લોડ ભૂલ:", err);
    }
}

document.getElementById("event-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "panchayats", panchayatId, "events"), {
        eventName: document.getElementById("event-name").value,
        eventDate: document.getElementById("event-date").value,
        eventLocation: document.getElementById("event-location").value
    });
    alert("ઇવેન્ટ ઉમેરાઈ ગઈ!");
    e.target.reset();
    loadAdminEvents();
});

async function loadContactAdminData() {
    try {
        const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "contact_info"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("adm-panchayat-name").value = data.panchayatName || "";
            document.getElementById("adm-address").value = data.address || "";
            document.getElementById("adm-email").value = data.email || "";
            document.getElementById("adm-phone").value = data.phone || "";
        }
    } catch (err) {
        console.error("સંપર્ક માહિતી લોડ ભૂલ:", err);
    }
}

document.getElementById("contact-admin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await setDoc(doc(db, "panchayats", panchayatId, "settings", "contact_info"), {
        panchayatName: document.getElementById("adm-panchayat-name").value,
        address: document.getElementById("adm-address").value,
        email: document.getElementById("adm-email").value,
        phone: document.getElementById("adm-phone").value
    }, { merge: true });
    alert("સંપર્ક વિગતો સેવ થઈ ગઈ!");
});

function loadAdminFeedbacks() {
    const container = document.getElementById("admin-feedback-list");
    if (!container) return;
    onSnapshot(collection(db, "panchayats", panchayatId, "user_feedbacks"), (snapshot) => {
        container.innerHTML = "";
        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">કોઈ પ્રતિસાદ નથી.</p>`;
            return;
        }
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `
                <div class="bg-gray-50 border p-3 rounded-xl text-xs">
                    <b>${data.name || 'અનામી'}</b> (${data.phone}): ${data.message}
                </div>
            `;
        });
    });
}

async function loadAdminData() {
    try {
        const snap = await getDoc(doc(db, "panchayats", panchayatId));
        if (snap.exists() && snap.data().proactiveData) {
            const data = snap.data().proactiveData;
            if (data.officer) {
                document.getElementById("off-name").value = data.officer.name || "";
                document.getElementById("off-phone").value = data.officer.phone || "";
                document.getElementById("off-appeal").value = data.officer.appealOfficer || "";
            }
        }
    } catch (err) {
        console.error("પ્રોએક્ટિવ ડેટા લોડ ભૂલ:", err);
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

        await setDoc(doc(db, "panchayats", panchayatId), {
            proactiveData: { officer }
        }, { merge: true });

        alert("માહિતી સફળતાપૂર્વક સેવ/અપડેટ થઈ ગઈ!");
    } catch (err) {
        console.error("Save error:", err);
    }
});
