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
        loadAdminGallery(); // લોગિન થાય એટલે ગેલેરીનું લિસ્ટ લોડ થશે
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

// Save Customization (માત્ર નામ અને ટેગલાઇન માટે)
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

// ૧. Quill Word Editor ચાલુ કરવું
var quill = new Quill('#editor-container', {
    theme: 'snow',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['clean']
        ]
    }
});

// જૂનો ઇતિહાસ ડેટાબેઝમાંથી લોડ કરવો
async function loadHistory() {
    const docRef = doc(db, "settings", "village_history");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        quill.root.innerHTML = docSnap.data().content;
    }
}
loadHistory();

// ૨. ઇતિહાસ સેવ કરવો
document.getElementById("save-history-btn")?.addEventListener("click", async () => {
    const historyHTML = quill.root.innerHTML;
    await setDoc(doc(db, "settings", "village_history"), {
        content: historyHTML,
        updatedAt: new Date()
    });
    alert("ગામનો ઇતિહાસ સફળતાપૂર્વક સેવ થઈ ગયો!");
});

// ૩. Blogger ફોટો ગેલેરી સેવ કરવી
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
    loadAdminGallery(); // નવો ફોટો ઉમેરાય એટલે લિસ્ટ તરત જ અપડેટ થશે
});

// ૪. ગેલેરી લિસ્ટ લોડ કરવું અને ડિલીટ કરવાનો કોડ
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

<!-- સેક્શન ૫: Blogger ફોટો ગેલેરી મેનેજર (ડિલીટ લિસ્ટ સાથે) -->
<div class="bg-orange-50/70 border border-orange-200 p-5 rounded-xl shadow-sm space-y-4 max-h-[500px] overflow-y-auto">
    <h3 class="font-bold border-b border-orange-300 pb-2 text-orange-900">૫. Blogger ફોટો ગેલેરી</h3>
    
    <!-- ફોટો ઉમેરવાનું ફોર્મ -->
    <form id="gallery-form" class="space-y-3">
        <div>
            <label class="text-xs font-semibold text-orange-950">ફોટાનું શીર્ષક:</label>
            <input type="text" id="img-title" placeholder="દા.ત. ગ્રામ સભા" required class="w-full border border-orange-300 p-2 rounded text-sm bg-white">
        </div>
        <div>
            <label class="text-xs font-semibold text-orange-950">Blogger Image URL:</label>
            <input type="url" id="img-url" placeholder="https://..." required class="w-full border border-orange-300 p-2 rounded text-sm bg-white">
        </div>
        <button type="submit" class="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs px-4 py-2 rounded font-bold shadow transition">ગેલેરીમાં ફોટો ઉમેરો</button>
    </form>

    <!-- ⚠️ આ બોક્સ ગાયબ હતું: ઉમેરેલા ફોટાનું લિસ્ટ અને ડિલીટ બટન -->
    <div class="mt-4 border-t border-orange-200 pt-3">
        <h4 class="text-xs font-bold text-orange-950 mb-2">📸 ઉમેરેલા ફોટા (ડિલીટ કરવા માટે):</h4>
        <div id="admin-gallery-list" class="space-y-2 max-h-48 overflow-y-auto pr-1">
            <p class="text-xs text-gray-500">ફોટા લોડ થઈ રહ્યા છે...</p>
        </div>
    </div>
</div>
    
    // ડિલીટ બટન માટે ઈવેન્ટ લિસનર્સ
    document.querySelectorAll(".delete-gallery-btn").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const docId = e.target.getAttribute("data-id");
            if (confirm("શું તમે આ ફોટો ગેલેરીમાંથી કાઢી નાખવા માંગો છો?")) {
                await deleteDoc(doc(db, "gallery", docId));
                alert("ફોટો ડિલીટ થઈ ગયો છે.");
                loadAdminGallery(); // રિફ્રેશ લિસ્ટ
            }
        });
    });
}
