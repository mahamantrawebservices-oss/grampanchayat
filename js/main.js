import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Load Settings
async function loadSettings() {
    const docRef = doc(db, "settings", "general");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if(data.name) document.getElementById("gp-name").innerText = data.name;
        if(data.tagline) document.getElementById("gp-tagline").innerText = data.tagline;
        if(data.logoUrl) document.getElementById("gp-logo").src = data.logoUrl;
    }
}

// Load Scroll Posts
async function loadPosts() {
    const querySnapshot = await getDocs(collection(db, "posts"));
    const container = document.getElementById("posts-container");
    container.innerHTML = "";
    querySnapshot.forEach((doc) => {
        const item = doc.data();
        if(item.type === 'post') {
            container.innerHTML += `
                <div class="p-2 border-b bg-white rounded shadow-sm">
                    <h4 class="font-bold text-emerald-700">${item.title}</h4>
                    <p class="text-xs text-gray-600">${item.desc}</p>
                </div>
            `;
        }
    });
}

// Submit Complaint
document.getElementById("complaint-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "complaints"), {
            name: document.getElementById("c-name").value,
            mobile: document.getElementById("c-mobile").value,
            faliya: document.getElementById("c-faliya").value,
            house: document.getElementById("c-house").value,
            type: document.getElementById("c-type").value,
            msg: document.getElementById("c-msg").value,
            status: "Pending",
            date: new Date().toLocaleDateString('gu-IN')
        });
        alert("તમારી ફરિયાદ સફળતાપૂર્વક નોંધાઈ ગઈ છે!");
        e.target.reset();
    } catch (err) {
        alert("ભૂલ આવી: " + err.message);
    }
});

loadSettings();
loadPosts();
