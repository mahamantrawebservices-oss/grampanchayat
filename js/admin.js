import { db, storage, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Check Authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login-modal")?.classList.add("hidden");
        document.getElementById("admin-dashboard")?.classList.remove("hidden");
        loadAdminComplaints();
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

// Save Customization & Upload Logo
document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("set-gp-name").value;
    const tagline = document.getElementById("set-gp-tagline").value;
    const logoFile = document.getElementById("set-gp-logo").files[0];

    let logoUrl = "";
    if (logoFile) {
        const storageRef = ref(storage, 'logo/gp-logo.png');
        await uploadBytes(storageRef, logoFile);
        logoUrl = await getDownloadURL(storageRef);
    }

    await setDoc(doc(db, "settings", "general"), {
        ...(name && { name }),
        ...(tagline && { tagline }),
        ...(logoUrl && { logoUrl })
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
});
