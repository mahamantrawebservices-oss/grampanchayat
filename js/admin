import { db, storage, auth } from "./firebase-config.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, addDoc, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Check Authentication
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById("login-modal").classList.add("hidden");
        document.getElementById("admin-dashboard").classList.remove("hidden");
        loadAdminComplaints();
    } else {
        document.getElementById("login-modal").classList.remove("hidden");
        document.getElementById("admin-dashboard").classList.add("hidden");
    }
});

// Admin Login
document.getElementById("admin-login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const pass = document.getElementById("login-password").value;
    signInWithEmailAndPassword(auth, email, pass).catch(err => alert("લોગિન નિષ્ફળ: " + err.message));
});

// Logout
document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));

// Save Customization & Upload Logo
document.getElementById("settings-form").addEventListener("submit", async (e) => {
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
document.getElementById("post-form").addEventListener("submit", async (e) => {
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

// Fetch Complaints with Report Feature
async function loadAdminComplaints() {
    const snap = await getDocs(collection(db, "complaints"));
    const container = document.getElementById("complaint-list");
    container.innerHTML = "";
    snap.forEach((doc) => {
        const c = doc.data();
        container.innerHTML += `
            <div class="border p-2 rounded bg-gray-50 space-y-1">
                <div class="font-bold">${c.name} (${c.mobile})</div>
                <div class="text-gray-600">${c.type} - ${c.faliya}, ${c.house}</div>
                <div>${c.msg}</div>
                <button onclick="window.print()" class="bg-slate-700 text-white px-2 py-0.5 text-[10px] rounded">તાલુકા કચેરી રિપોર્ટ પ્રિન્ટ કરો</button>
            </div>
        `;
    });
}
