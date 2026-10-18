import { db, storage, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, onSnapshot, addDoc, updateDoc, getDocs, doc, setDoc, getDoc, deleteDoc, query, orderBy, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// URL mathi panchayat ID melavvu
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
                        <h2 class="text-2xl font-bold text-amber-400">Sistam Maintenance chalu chhe</h2>
                        <p class="text-gray-300 text-sm">Hal ma sistam update hetal chhe.</p>
                    </div>
                </div>`;
            return false;
        }

        const pSnap = await getDoc(doc(db, "panchayats", panchayatId));
        if (pSnap.exists() && pSnap.data().isActive === false) {
            document.body.innerHTML = `
                <div class="fixed inset-0 bg-gray-900/90 text-white z-40 flex flex-col items-center justify-center p-6 text-center">
                    <div class="bg-white text-gray-800 p-8 rounded-3xl max-w-md shadow-2xl space-y-4">
                        <h2 class="text-xl font-bold text-red-600">Subscription nishkriya chhe (Deactive)</h2>
                        <p class="text-gray-600 text-sm">Aa gram panchayat nu subscription active nathi.</p>
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
        loadAdminVillageMapLinks();
        loadAdminData(); // Proactive Disclosure Loader
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
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("Login nishfal: " + err.message));
});

// Logout
document.getElementById("logout-btn")?.addEventListener("click", () => signOut(auth));

// Save Customization (General Settings)
document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("set-gp-name")?.value;
    const tagline = document.getElementById("set-gp-tagline")?.value;

    await setDoc(doc(db, "panchayats", panchayatId, "settings", "general"), {
        ...(name && { name }),
        ...(tagline && { tagline })
    }, { merge: true });

    alert("Settings safaltapurvak save thai gaya!");
});

// Global Cache object for Posts
let postsCache = {};

function resetPostForm() {
    const form = document.getElementById('add-post-form');
    if (!form) return;

    form.reset();
    document.getElementById('edit-post-id').value = "";
    document.getElementById('submit-post-btn').textContent = "Post Umero";
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
            alert("Post safaltapurvak update thai gai!");
        } else {
            await addDoc(collection(db, "panchayats", panchayatId, "posts"), {
                title: title,
                desc: desc,
                type: 'post',
                createdAt: new Date()
            });
            alert("Navi post safaltapurvak umerai gai!");
        }

        resetPostForm();
    } catch (error) {
        console.error("Error saving post:", error);
        alert("Save karvama bhul avi, fari prayatna karo.");
    }
});

function loadAdminPosts() {
    const container = document.getElementById("admin-posts-list");
    if (!container) return;

    onSnapshot(collection(db, "panchayats", panchayatId, "posts"), (snapshot) => {
        container.innerHTML = "";
        postsCache = {};

        if (snapshot.empty) {
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">Koi post ke news meleli nathi.</p>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            postsCache[id] = data;

            const title = data.title || data.heading || "Anami Post";
            const desc = data.desc || data.description || "";
            
            let dateStr = "Tarikh uplabdh nathi";
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
                    <button onclick="editPost('${id}')" class="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[10px] font-bold">Edit</button>
                    <button onclick="deletePost('${id}')" class="bg-red-500 hover:bg-red-700 text-white px-2 py-1 rounded text-[10px] font-bold">Delete</button>
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

    document.getElementById('submit-post-btn').textContent = "Update Karo";
    document.getElementById('cancel-post-edit-btn').classList.remove('hidden');
    document.getElementById('add-post-form').scrollIntoView({ behavior: 'smooth' });
};

window.deletePost = async (id) => {
    if (confirm("Shu tame kharekhar aa post delete karva mango cho?")) {
        try {
            await deleteDoc(doc(db, "panchayats", panchayatId, "posts", id));
            alert("Post delete thai gai!");
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
    document.getElementById('submit-notice-btn').textContent = "Notis Post Karo";
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
            alert("Notis safaltapurvak update thai gai!");
        } else {
            await addDoc(collection(db, "panchayats", panchayatId, "notices"), {
                title: title,
                desc: desc,
                createdAt: new Date()
            });
            alert("Navi notis safaltapurvak sachvai gai!");
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
            container.innerHTML = `<p class="text-xs text-gray-500 p-2">Koi notis ke post meleli nathi.</p>`;
            return;
        }

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            noticesCache[id] = data;

            const title = data.title || data.noticeTitle || "Anami Notis";
            const desc = data.desc || data.description || "";
            
            let dateStr = "Tarikh uplabdh nathi";
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
                    <button onclick="editNotice('${id}')" class="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold">Edit</button>
                    <button onclick="deleteNotice('${id}')" class="bg-red-500 text-white px-2 py-1 rounded text-[10px] font-bold">Delete</button>
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

    document.getElementById('submit-notice-btn').textContent = "Update Karo";
    document.getElementById('cancel-notice-edit-btn').classList.remove('hidden');
    document.getElementById('add-notice-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteNotice = async (id) => {
    if (confirm("Shu tame kharekhar aa notis delete karva mango cho?")) {
        try {
            await deleteDoc(doc(db, "panchayats", panchayatId, "notices", id));
            alert("Notis delete thai gai!");
            if (document.getElementById('edit-notice-id').value === id) {
                resetNoticeForm();
            }
        } catch (err) {
            console.error("Delete error:", err);
        }
    }
};

// Gallery Manager
document.getElementById("gallery-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("img-title").value;
    const url = document.getElementById("img-url").value;

    await addDoc(collection(db, "panchayats", panchayatId, "gallery"), {
        title: title,
        imageUrl: url,
        createdAt: new Date()
    });

    alert("Photo gallery ma umerai gayo!");
    e.target.reset();
    loadAdminGallery();
});

async function loadAdminGallery() {
    const snap = await getDocs(collection(db, "panchayats", panchayatId, "gallery"));
    const container = document.getElementById("admin-gallery-list");
    if (!container) return;
    
    container.innerHTML = "";
    if (snap.empty) {
        container.innerHTML = "<p class='text-xs text-gray-500'>Koi photo melelo nathi.</p>";
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
                <button data-id="${id}" class="delete-gallery-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded transition flex-shrink-0">Delete</button>
            </div>
        `;
    });

    document.querySelectorAll(".delete-gallery-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const docId = e.target.getAttribute("data-id");
            if (confirm("Shu tame aa photo gallery mathi kadhi nakhva mango cho?")) {
                await deleteDoc(doc(db, "panchayats", panchayatId, "gallery", docId));
                loadAdminGallery();
            }
        });
    });
}

// Menu / Village Details Manager
let menuQuill = null;
if (document.getElementById('menu-editor-container')) {
    menuQuill = new Quill('#menu-editor-container', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
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
            alert("Menu safaltapurvak update thai gayu!");
        } else {
            await addDoc(collection(db, "panchayats", panchayatId, "village_details"), {
                title: title,
                content: content,
                isShow: true,
                createdAt: new Date()
            });
            alert("Navu menu safaltapurvak umerai gayu!");
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
    if (document.getElementById("save-menu-btn")) document.getElementById("save-menu-btn").innerText = "Menu Save Karo";
    document.getElementById("cancel-edit-btn")?.classList.add("hidden");
}

document.getElementById("cancel-edit-btn")?.addEventListener("click", resetMenuForm);

async function loadAdminMenuList() {
    const container = document.getElementById("admin-menu-list");
    if (!container) return;

    try {
        const querySnapshot = await getDocs(collection(db, "panchayats", panchayatId, "village_details"));
        container.innerHTML = "";

        if (querySnapshot.empty) {
            container.innerHTML = "<p class='text-xs text-gray-500'>Koi menu malel nathi.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            const id = docSnap.id;
            const isShow = item.isShow !== false;

            container.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm mb-1">
                    <span class="text-xs font-semibold ${isShow ? 'text-gray-800' : 'text-gray-400 line-through'}">${item.title || 'Nam vagar nu'}</span>
                    <div class="flex items-center gap-1.5">
                        <button type="button" data-id="${id}" class="edit-menu-btn bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-bold">Edit</button>
                        <button type="button" data-id="${id}" data-status="${isShow}" class="toggle-show-btn text-[10px] px-2 py-1 rounded text-white ${isShow ? 'bg-amber-600' : 'bg-gray-500'} font-bold">${isShow ? 'Santado' : 'Batavo'}</button>
                        <button type="button" data-id="${id}" class="delete-menu-btn bg-red-600 text-white text-[10px] px-2 py-1 rounded font-bold">Delete</button>
                    </div>
                </div>
            `;
        });

        attachMenuEventListeners();
    } catch (err) {
        console.error("Menu Load Error:", err);
    }
}

function attachMenuEventListeners() {
    document.querySelectorAll(".edit-menu-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "village_details", id));
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById("edit-menu-id").value = id;
                document.getElementById("menu-title").value = data.title || "";
                if (typeof menuQuill !== 'undefined') menuQuill.root.innerHTML = data.content || "";
                document.getElementById("save-menu-btn").innerText = "Update Karo";
                document.getElementById("cancel-edit-btn").classList.remove("hidden");
                document.getElementById("add-menu-form")?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    document.querySelectorAll(".toggle-show-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const currentStatus = e.target.getAttribute("data-status") === "true";
            await setDoc(doc(db, "panchayats", panchayatId, "village_details", id), { isShow: !currentStatus }, { merge: true });
            loadAdminMenuList();
        });
    });

    document.querySelectorAll(".delete-menu-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            if (confirm("Shu tame aa menu delete karva mango cho?")) {
                await deleteDoc(doc(db, "panchayats", panchayatId, "village_details", id));
                loadAdminMenuList();
            }
        });
    });
}

// Complaints Manager & PDF Report
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
                    <span>Token: <span class="text-amber-600">${item.token || 'N/A'}</span> (${item.name || ''} - ${item.mobile || ''})</span>
                    <span class="text-emerald-700">${item.type || ''}</span>
                </div>
                <p><b>Tarikh & Samay:</b> <span class="text-blue-600 font-semibold">${formattedDate}</span></p>
                <p><b>Vistar:</b> ${item.area || ''} | <b>Vigat:</b> ${item.details || ''}</p>
                <div class="flex flex-wrap items-center gap-2">
                    <label class="font-bold">Status Badlo:</label>
                    <select data-id="${d.id}" class="update-status-select border p-1 rounded bg-amber-50">
                        <option value="${item.status}" selected>Hal nu: ${item.status}</option>
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
            alert("Status update thai gayu!");
            loadAdminComplaints();
        });
    });
}

document.getElementById("admin-complaint-filter")?.addEventListener("change", loadAdminComplaints);

// PDF Report Download
document.getElementById("download-pdf-btn")?.addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const docPdf = new jsPDF();
    const snap = await getDocs(collection(db, "panchayats", panchayatId, "complaints"));
    
    const rows = [];
    snap.forEach(d => {
        const item = d.data();
        rows.push([item.token || '-', item.name || '-', item.mobile || '-', item.type || '-', item.status || '-']);
    });

    docPdf.text("Gram Panchayat Complaints Report", 14, 15);
    docPdf.autoTable({
        head: [['Token', 'Name', 'Mobile', 'Type', 'Status']],
        body: rows,
        startY: 20,
    });
    docPdf.save("complaints-report.pdf");
});

// Staff & Committee Meta
async function loadAdminMeta() {
    try {
        const snap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "staff_page_meta"));
        if (snap.exists()) {
            const data = snap.data();
            if (document.getElementById("admin-term-input")) document.getElementById("admin-term-input").value = data.term || "";
            if (document.getElementById("admin-note-input")) document.getElementById("admin-note-input").value = data.note || "";
        }
    } catch (err) { console.error(err); }
}

document.getElementById("save-meta-btn")?.addEventListener("click", async () => {
    const term = document.getElementById("admin-term-input").value;
    const note = document.getElementById("admin-note-input").value;
    await setDoc(doc(db, "panchayats", panchayatId, "settings", "staff_page_meta"), { term, note }, { merge: true });
    alert("Mudat ane nondh sachvai gai!");
});

async function loadAdminStaffAndCommittee() {
    const committeeContainer = document.getElementById("admin-committee-list");
    const staffContainer = document.getElementById("admin-staff-list");

    if (committeeContainer) {
        const committeeSnap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_committee"));
        committeeContainer.innerHTML = "";
        committeeSnap.forEach(docSnap => {
            const item = docSnap.data();
            committeeContainer.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs mb-1">
                    <div><b>${item.name}</b> (${item.designation}) - Ward: ${item.ward || '-'}</div>
                    <button data-id="${docSnap.id}" data-col="panchayat_committee" class="delete-ms-btn bg-red-600 text-white text-[10px] px-2 py-1 rounded">Delete</button>
                </div>
            `;
        });
    }

    if (staffContainer) {
        const staffSnap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_staff"));
        staffContainer.innerHTML = "";
        staffSnap.forEach(docSnap => {
            const item = docSnap.data();
            staffContainer.innerHTML += `
                <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs mb-1">
                    <div><b>${item.name}</b> (${item.designation})</div>
                    <button data-id="${docSnap.id}" data-col="panchayat_staff" class="delete-ms-btn bg-red-600 text-white text-[10px] px-2 py-1 rounded">Delete</button>
                </div>
            `;
        });
    }

    document.querySelectorAll(".delete-ms-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const col = e.target.getAttribute("data-col");
            if (confirm("Delete karvu chhe?")) {
                await deleteDoc(doc(db, "panchayats", panchayatId, col, id));
                loadAdminStaffAndCommittee();
            }
        });
    });
}

document.getElementById("add-member-staff-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = document.getElementById("ms-category").value;
    const targetCol = type === 'committee' ? 'panchayat_committee' : 'panchayat_staff';
    
    await addDoc(collection(db, "panchayats", panchayatId, targetCol), {
        name: document.getElementById("ms-name").value,
        designation: document.getElementById("ms-desig").value,
        mobile: document.getElementById("ms-mobile").value,
        ward: document.getElementById("ms-ward").value || '',
        order: Date.now()
    });
    alert("Umerai gayu!");
    e.target.reset();
    loadAdminStaffAndCommittee();
});

// Officer Schedule
async function loadAdminSchedule() {
    const container = document.getElementById("admin-schedule-list");
    if (!container) return;
    const snap = await getDocs(collection(db, "panchayats", panchayatId, "panchayat_schedule"));
    container.innerHTML = "";
    snap.forEach(docSnap => {
        const item = docSnap.data();
        container.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm text-xs mb-1">
                <div><b>${item.name}</b> (${item.designation}) - ${item.timing}</div>
                <button data-id="${docSnap.id}" class="delete-sch-btn bg-red-600 text-white text-[10px] px-2 py-1 rounded">Delete</button>
            </div>
        `;
    });
    document.querySelectorAll(".delete-sch-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            await deleteDoc(doc(db, "panchayats", panchayatId, "panchayat_schedule", e.target.getAttribute("data-id")));
            loadAdminSchedule();
        });
    });
}

document.getElementById("add-schedule-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "panchayats", panchayatId, "panchayat_schedule"), {
        name: document.getElementById("sch-name").value,
        designation: document.getElementById("sch-desig").value,
        timing: document.getElementById("sch-timing").value,
        days: document.getElementById("sch-days").value,
        note: document.getElementById("sch-note").value || ''
    });
    alert("Samay patrak umerai gayu!");
    e.target.reset();
    loadAdminSchedule();
});

// Tax Link
async function loadAdminTaxLink() {
    const inputEl = document.getElementById("tax-payment-url");
    if (!inputEl) return;
    const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "tax_payment"));
    if (docSnap.exists()) inputEl.value = docSnap.data().url || "";
}

document.getElementById("tax-link-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await setDoc(doc(db, "panchayats", panchayatId, "settings", "tax_payment"), { url: document.getElementById("tax-payment-url").value }, { merge: true });
    alert("Tax link update thai gai!");
});

// Custom Buttons
async function loadAdminCustomButtons() {
    const listDiv = document.getElementById("admin-custom-buttons-list");
    if (!listDiv) return;
    const snap = await getDocs(collection(db, "panchayats", panchayatId, "custom_pages"));
    listDiv.innerHTML = "";
    snap.forEach(docSnap => {
        const data = docSnap.data();
        listDiv.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs mb-1">
                <span>${data.buttonTitle}</span>
                <button data-id="${docSnap.id}" class="delete-page-btn bg-red-600 text-white px-2 py-1 rounded text-[10px]">Delete</button>
            </div>
        `;
    });
    document.querySelectorAll(".delete-page-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            await deleteDoc(doc(db, "panchayats", panchayatId, "custom_pages", e.target.getAttribute("data-id")));
            loadAdminCustomButtons();
        });
    });
}

document.getElementById("add-page-button-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "panchayats", panchayatId, "custom_pages"), {
        buttonTitle: document.getElementById("custom-btn-title").value,
        htmlContent: document.getElementById("custom-page-html").value
    });
    alert("Button umerai gayu!");
    e.target.reset();
    loadAdminCustomButtons();
});

// Events Manager
async function loadAdminEvents() {
    const listDiv = document.getElementById("admin-events-list");
    if (!listDiv) return;
    const snap = await getDocs(collection(db, "panchayats", panchayatId, "events"));
    listDiv.innerHTML = "";
    snap.forEach(docSnap => {
        const data = docSnap.data();
        listDiv.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs mb-1">
                <span>${data.eventName} (${data.eventDate})</span>
                <button data-id="${docSnap.id}" class="delete-event-btn bg-red-600 text-white px-2 py-1 rounded text-[10px]">Delete</button>
            </div>
        `;
    });
    document.querySelectorAll(".delete-event-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            await deleteDoc(doc(db, "panchayats", panchayatId, "events", e.target.getAttribute("data-id")));
            loadAdminEvents();
        });
    });
}

document.getElementById("event-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "panchayats", panchayatId, "events"), {
        eventName: document.getElementById("event-name").value,
        eventDate: document.getElementById("event-date").value,
        eventLocation: document.getElementById("event-location").value
    });
    alert("Event umerai gai!");
    e.target.reset();
    loadAdminEvents();
});

// Disaster Management
document.getElementById("disaster-management-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = document.getElementById("disaster-page-key").value;
    const content = document.getElementById("disaster-page-content").value;
    await setDoc(doc(db, "panchayats", panchayatId, "disaster_management", key), { content }, { merge: true });
    alert("Mahiti sachvai gai!");
});

// Village Map Links
async function loadAdminVillageMapLinks() {
    try {
        const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "village_map_settings", "links"));
        if (docSnap.exists()) {
            const data = docSnap.data();
            document.getElementById("admin-satellite-url").value = data.satelliteUrl || "";
            document.getElementById("admin-revenue-pdf-url").value = data.revenuePdfUrl || "";
        }
    } catch(err) { console.error(err); }
}

document.getElementById("village-map-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await setDoc(doc(db, "panchayats", panchayatId, "village_map_settings", "links"), {
        satelliteUrl: document.getElementById("admin-satellite-url").value,
        revenuePdfUrl: document.getElementById("admin-revenue-pdf-url").value
    }, { merge: true });
    alert("Gram na naksha ni links sachvai gai!");
});

// Glance (Maru Gam - Ek Najarma) Manager
async function loadAdminGlanceList() {
    const container = document.getElementById("admin-glance-list");
    if (!container) return;
    const snap = await getDocs(collection(db, "panchayats", panchayatId, "glance_info"));
    container.innerHTML = "";
    snap.forEach(docSnap => {
        const item = docSnap.data();
        container.innerHTML += `
            <div class="flex justify-between items-center bg-gray-50 p-2 border rounded text-xs mb-1">
                <span><b>${item.section}:</b> ${item.title} - ${item.value}</span>
                <button data-id="${docSnap.id}" class="delete-glance-btn bg-red-600 text-white px-2 py-1 rounded text-[10px]">Delete</button>
            </div>
        `;
    });
    document.querySelectorAll(".delete-glance-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            await deleteDoc(doc(db, "panchayats", panchayatId, "glance_info", e.target.getAttribute("data-id")));
            loadAdminGlanceList();
        });
    });
}

document.getElementById("add-glance-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "panchayats", panchayatId, "glance_info"), {
        section: document.getElementById("glance-section").value,
        title: document.getElementById("glance-title").value,
        value: document.getElementById("glance-value").value,
        extra: document.getElementById("glance-extra").value || ''
    });
    alert("Mahiti umerai gai!");
    e.target.reset();
    loadAdminGlanceList();
});

// Contact Info
async function loadContactAdminData() {
    const docSnap = await getDoc(doc(db, "panchayats", panchayatId, "settings", "contact_info"));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById("adm-panchayat-name").value = data.panchayatName || "";
        document.getElementById("adm-address").value = data.address || "";
        document.getElementById("adm-email").value = data.email || "";
        document.getElementById("adm-phone").value = data.phone || "";
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
    alert("Sampark vigato save thai gai!");
});

function loadAdminFeedbacks() {
    const container = document.getElementById("admin-feedback-list");
    if (!container) return;
    onSnapshot(collection(db, "panchayats", panchayatId, "user_feedbacks"), (snapshot) => {
        container.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            container.innerHTML += `<div class="bg-gray-50 border p-3 rounded-xl text-xs"><b>${data.name || 'Anami'}</b>: ${data.message}</div>`;
        });
    });
}

// ==========================================
// PROACTIVE DISCLOSURE MANAGER (સ્વયં જાહેર કરેલ માહિતી)
// ==========================================
async function loadAdminData() {
    try {
        const snap = await getDoc(doc(db, "panchayats", panchayatId, "proactive_disclosure", "main_data"));
        if (snap.exists()) {
            const data = snap.data();
            if (data.officer) {
                document.getElementById("off-name").value = data.officer.name || "";
                document.getElementById("off-phone").value = data.officer.phone || "";
                document.getElementById("off-appeal").value = data.officer.appealOfficer || "";
            }
            document.getElementById("extra-title").value = data.extraTitle || "";
            document.getElementById("extra-content").value = data.extraContent || "";

            renderPopulationRows(data.population || []);
            renderWaterRows(data.water || []);
            renderPropertyRows(data.property || []);
        } else {
            renderPopulationRows([]);
            renderWaterRows([]);
            renderPropertyRows([]);
        }
    } catch (err) {
        console.error("Proactive data load bhul:", err);
    }
}

function renderPopulationRows(list) {
    const container = document.getElementById("population-rows-container");
    if (!container) return;
    container.innerHTML = "";
    list.forEach((item) => container.appendChild(createPopRow(item)));
}

function createPopRow(item = {}) {
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center bg-white p-2 rounded border pop-row";
    div.innerHTML = `
        <input type="text" placeholder="Vigat (e.g. Kul Vasti)" value="${item.title || ''}" class="pop-title w-1/3 border p-1 rounded text-xs" required>
        <input type="text" placeholder="Stri" value="${item.female || ''}" class="pop-female w-1/5 border p-1 rounded text-xs">
        <input type="text" placeholder="Purush" value="${item.male || ''}" class="pop-male w-1/5 border p-1 rounded text-xs">
        <input type="text" placeholder="Kul" value="${item.total || ''}" class="pop-total w-1/5 border p-1 rounded text-xs" required>
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 font-bold px-2">×</button>
    `;
    return div;
}

document.getElementById("add-pop-row")?.addEventListener("click", () => {
    document.getElementById("population-rows-container")?.appendChild(createPopRow());
});

function renderWaterRows(list) {
    const container = document.getElementById("water-rows-container");
    if (!container) return;
    container.innerHTML = "";
    list.forEach((item) => container.appendChild(createWaterRow(item)));
}

function createWaterRow(item = {}) {
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center bg-white p-2 rounded border water-row";
    div.innerHTML = `
        <input type="text" placeholder="Jalashay Nam" value="${item.source || ''}" class="water-source w-1/4 border p-1 rounded text-xs" required>
        <input type="text" placeholder="Sankhya" value="${item.count || ''}" class="water-count w-1/4 border p-1 rounded text-xs">
        <input type="text" placeholder="Vistar" value="${item.area || ''}" class="water-area w-1/4 border p-1 rounded text-xs">
        <input type="text" placeholder="Kshamata" value="${item.capacity || ''}" class="water-capacity w-1/4 border p-1 rounded text-xs">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 font-bold px-2">×</button>
    `;
    return div;
}

document.getElementById("add-water-row")?.addEventListener("click", () => {
    document.getElementById("water-rows-container")?.appendChild(createWaterRow());
});

function renderPropertyRows(list) {
    const container = document.getElementById("property-rows-container");
    if (!container) return;
    container.innerHTML = "";
    list.forEach((item) => container.appendChild(createPropertyRow(item)));
}

function createPropertyRow(item = {}) {
    const div = document.createElement("div");
    div.className = "flex gap-2 items-center bg-white p-2 rounded border prop-row";
    div.innerHTML = `
        <input type="text" placeholder="Milkat Nam" value="${item.name || ''}" class="prop-name w-1/3 border p-1 rounded text-xs" required>
        <input type="text" placeholder="Sankhya" value="${item.count || ''}" class="prop-count w-1/4 border p-1 rounded text-xs">
        <input type="text" placeholder="Vadhare ni vigat" value="${item.detail || ''}" class="prop-detail w-1/3 border p-1 rounded text-xs">
        <button type="button" onclick="this.parentElement.remove()" class="text-red-600 font-bold px-2">×</button>
    `;
    return div;
}

document.getElementById("add-prop-row")?.addEventListener("click", () => {
    document.getElementById("property-rows-container")?.appendChild(createPropertyRow());
});

document.getElementById("proactive-admin-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const officer = {
            name: document.getElementById("off-name").value.trim(),
            phone: document.getElementById("off-phone").value.trim(),
            appealOfficer: document.getElementById("off-appeal").value.trim()
        };

        const extraTitle = document.getElementById("extra-title").value.trim();
        const extraContent = document.getElementById("extra-content").value.trim();

        const population = [];
        document.querySelectorAll(".pop-row").forEach(row => {
            population.push({
                title: row.querySelector(".pop-title").value.trim(),
                female: row.querySelector(".pop-female").value.trim(),
                male: row.querySelector(".pop-male").value.trim(),
                total: row.querySelector(".pop-total").value.trim()
            });
        });

        const water = [];
        document.querySelectorAll(".water-row").forEach(row => {
            water.push({
                source: row.querySelector(".water-source").value.trim(),
                count: row.querySelector(".water-count").value.trim(),
                area: row.querySelector(".water-area").value.trim(),
                capacity: row.querySelector(".water-capacity").value.trim()
            });
        });

        const property = [];
        document.querySelectorAll(".prop-row").forEach(row => {
            property.push({
                name: row.querySelector(".prop-name").value.trim(),
                count: row.querySelector(".prop-count").value.trim(),
                detail: row.querySelector(".prop-detail").value.trim()
            });
        });

        await setDoc(doc(db, "panchayats", panchayatId, "proactive_disclosure", "main_data"), {
            officer,
            extraTitle,
            extraContent,
            population,
            water,
            property,
            updatedAt: new Date()
        }, { merge: true });

        alert("Swayam jahir karel mahiti safaltapurvak save/update thai gai!");
    } catch (err) {
        console.error("Save error:", err);
        alert("Save karvama bhul avi: " + err.message);
    }
});
