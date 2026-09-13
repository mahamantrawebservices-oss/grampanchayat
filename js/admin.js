import { db, storage, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Check Authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login-modal")?.classList.add("hidden");
        document.getElementById("admin-dashboard")?.classList.remove("hidden");
        loadAdminComplaints();
        loadAdminGallery();
    } else {
        document.getElementById("login-modal")?.classList.remove("hidden");
        document.getElementById("admin-dashboard")?.classList.add("hidden");
    }
});

// Admin Login
document.getElementById("admin-login-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("લોગિન નિષ્ફળ: " + err.message));
});

// Logout
document.getElementById("logout-btn")?.addEventListener("click", () => signOut(auth));

// Save Customization
document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("set-gp-name").value;
    const tagline = document.getElementById("set-gp-tagline").value;

    await setDoc(doc(db, "settings", "general"), {
        ...(name && { name }),
        ...(tagline && { tagline })
    }, { merge: true });

    alert("સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગયા!");
});

// Add Post/Notice
document.getElementById("post-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "posts"), {
        type: document.getElementById("post-type").value,
        title: document.getElementById("post-title").value,
        desc: document.getElementById("post-desc").value,
        createdAt: new Date()
    });
    alert("પોસ્ટ ઉમેરાઈ ગઈ!");
    e.target.reset();
});

// Fetch Complaints
async function loadAdminComplaints() {
    const snap = await getDocs(collection(db, "complaints"));
    const container = document.getElementById("complaints-list");
    if (!container) return;
    container.innerHTML = "";
    snap.forEach((docSnap) => {
        const c = docSnap.data();
        container.innerHTML += `
            <div class="border p-2 rounded bg-gray-50 mb-2">
                <div class="font-bold">${c.name} (${c.mobile})</div>
                <div class="text-xs text-gray-600">${c.type} - ${c.faliya}, ${c.house}</div>
                <div class="text-sm mt-1">${c.msg}</div>
                <button onclick="window.print()" class="mt-2 bg-slate-700 text-white px-2 py-0.5 text-[10px] rounded">પ્રિન્ટ રિપોર્ટ</button>
            </div>
        `;
    });
}


// Blogger ફોટો ગેલેરી સેવ કરવી
document.getElementById("gallery-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("img-title").value;
    const url = document.getElementById("img-url").value;

    await addDoc(collection(db, "gallery"), {
        title: title,
        imageUrl: url,
        createdAt: new Date()
    });

    alert("ફોટો ગેલેરીમાં ઉમેરાઈ ગયો!");
    e.target.reset();
    loadAdminGallery();
});

// ગેલેરી લિસ્ટ લોડ કરવું અને ડિલીટ કરવું
async function loadAdminGallery() {
    const snap = await getDocs(collection(db, "gallery"));
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
                await deleteDoc(doc(db, "gallery", docId));
                alert("ફોટો ડિલીટ થઈ ગયો છે.");
                loadAdminGallery();
            }
        });
    });
}

// ૧. વિગત મેનેજર માટે Quill Word Editor
var menuQuill = new Quill('#menu-editor-container', {
    theme: 'snow',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'indent': '-1'}, { 'indent': '+1' }], // 👈 (+1 સ્પેસ આપશે)
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['clean']
        ]
    }
});

// ૨. નવું મેનૂ ઉમેરવું તથા જૂનું મેનૂ એડિટ (અપડેટ) કરવું
document.getElementById("add-menu-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("edit-menu-id").value;
    const title = document.getElementById("menu-title").value;
    const content = menuQuill.root.innerHTML;

    if (editId) {
        // ૧. જો એડિટ મોડ હોય તો અપડેટ કરશે
        await setDoc(doc(db, "village_details", editId), {
            title: title,
            content: content,
            updatedAt: new Date()
        }, { merge: true });

        alert("મેનૂ સફળતાપૂર્વક અપડેટ થઈ ગયું!");
    } else {
        // ૨. નવું મેનૂ એડ કરશે
        await addDoc(collection(db, "village_details"), {
            title: title,
            content: content,
            isShow: true,
            createdAt: new Date()
        });

        alert("નવું મેનૂ સફળતાપૂર્વક ઉમેરાઈ ગયું!");
    }

    resetMenuForm();
    loadAdminMenuList();
});

// ફોર્મ રીસેટ કરવા માટેનું ફંક્શન
function resetMenuForm() {
    document.getElementById("add-menu-form").reset();
    document.getElementById("edit-menu-id").value = "";
    menuQuill.root.innerHTML = "";
    document.getElementById("save-menu-btn").innerText = "મેનૂ સેવ કરો";
    document.getElementById("cancel-edit-btn").classList.add("hidden");
}

// કેન્સલ બટન પર કિલક કરવાથી એડિટ મોડ બંધ થશે
document.getElementById("cancel-edit-btn")?.addEventListener("click", resetMenuForm);

// ૩. એડમિન લિસ્ટ લોડ કરવું (Edit, Show/Hide & Delete સાથે)
async function loadAdminMenuList() {
    const snap = await getDocs(collection(db, "village_details"));
    const container = document.getElementById("admin-menu-list");
    if (!container) return;

    container.innerHTML = "";
    if (snap.empty) {
        container.innerHTML = "<p class='text-xs text-gray-500'>કોઈ મેનૂ મળે લ નથી.</p>";
        return;
    }

    snap.forEach((docSnap) => {
        const item = docSnap.data();
        const id = docSnap.id;
        const isShow = item.isShow !== false;

        container.innerHTML += `
            <div class="flex justify-between items-center bg-white p-2 border rounded shadow-sm">
                <span class="text-xs font-semibold ${isShow ? 'text-gray-800' : 'text-gray-400 line-through'}">${item.title}</span>
                <div class="flex items-center gap-1.5">
                    <button data-id="${id}" class="edit-menu-btn bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded">
                        એડિટ
                    </button>
                    <button data-id="${id}" data-status="${isShow}" class="toggle-show-btn text-[10px] px-2 py-1 rounded text-white ${isShow ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-500 hover:bg-gray-600'}">
                        ${isShow ? 'સંતાડો' : 'બતાવો'}
                    </button>
                    <button data-id="${id}" class="delete-menu-btn bg-red-600 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded">
                        ડિલીટ
                    </button>
                </div>
            </div>
        `;
    });

    // ✏️ એડિટ બટન ઈવેન્ટ
    document.querySelectorAll(".edit-menu-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const docSnap = await getDoc(doc(db, "village_details", id));
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById("edit-menu-id").value = id;
                document.getElementById("menu-title").value = data.title;
                menuQuill.root.innerHTML = data.content || "";
                
                document.getElementById("save-menu-btn").innerText = "અપડેટ કરો";
                document.getElementById("cancel-edit-btn").classList.remove("hidden");
                
                // સ્ક્રોલ કરીને ફોર્મ સુધી લઈ જશે
                document.getElementById("add-menu-form").scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 👁️ Show/Hide ઈવેન્ટ
    document.querySelectorAll(".toggle-show-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            const currentStatus = e.target.getAttribute("data-status") === "true";
            await setDoc(doc(db, "village_details", id), { isShow: !currentStatus }, { merge: true });
            loadAdminMenuList();
        });
    });

    // 🗑️ ડિલીટ ઈવેન્ટ
    document.querySelectorAll(".delete-menu-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            if (confirm("શું તમે આ મેનૂ ડિલીટ કરવા માંગો છો?")) {
                await deleteDoc(doc(db, "village_details", id));
                loadAdminMenuList();
            }
        });
    });
}
// Check Auth માં લોડ કરવા માટે ઉમેરો
loadAdminMenuList();
