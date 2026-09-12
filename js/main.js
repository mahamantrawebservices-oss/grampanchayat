import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ૧. વેબસાઇટ સેટિંગ્સ લોડ કરવા
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

// ૨. સ્ક્રોલ થતી પોસ્ટ લોડ કરવી
async function loadPosts() {
    const querySnapshot = await getDocs(collection(db, "posts"));
    const container = document.getElementById("posts-container");
    if(!container) return;
    container.innerHTML = "";
    querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
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

// ૩. અગત્યની નોટિસ લોડ કરવી
async function loadNotices() {
    const querySnapshot = await getDocs(collection(db, "posts"));
    const noticeList = document.getElementById("notice-list");
    if (!noticeList) return;
    
    noticeList.innerHTML = "";
    let hasNotice = false;

    querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.type === 'notice') {
            hasNotice = true;
            noticeList.innerHTML += `
                <div class="border-b border-amber-200 pb-2 mb-2 last:border-b-0">
                    <h5 class="font-bold text-amber-900">• ${item.title}</h5>
                    <p class="text-xs text-amber-800 mt-1">${item.desc}</p>
                </div>
            `;
        }
    });

    if (!hasNotice) {
        noticeList.innerHTML = "<p class='text-xs text-gray-500'>હાલ કોઈ નવી નોટિસ નથી.</p>";
    }
}

// ૪. ગામનો ઇતિહાસ ફ્રન્ટએન્ડ પર બતાવવો
async function displayHistory() {
    const docSnap = await getDoc(doc(db, "settings", "village_history"));
    const historyContainer = document.getElementById("info-history");
    if (docSnap.exists() && historyContainer) {
        historyContainer.innerHTML = docSnap.data().content;
    }
}

// ૫. Blogger ફોટો ગેલેરી ફ્રન્ટએન્ડ પર બતાવવી
async function displayGallery() {
    const querySnapshot = await getDocs(collection(db, "gallery"));
    const container = document.getElementById("gallery-container");
    if(!container) return;
    container.innerHTML = "";
    
    querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
        container.innerHTML += `
            <div class="bg-white p-2 rounded-lg shadow border">
                <img src="${item.imageUrl}" alt="${item.title}" class="h-40 w-full object-cover rounded">
                <p class="text-xs font-bold text-center mt-2 text-gray-700">${item.title}</p>
            </div>
        `;
    });
}

// ૬. ફરિયાદ સબમિટ કરવી
document.getElementById("complaint-form")?.addEventListener("submit", async (e) => {
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

// બધી પ્રોસેસ ચાલુ કરવી
loadSettings();
loadPosts();
loadNotices();
displayHistory();
displayGallery();
