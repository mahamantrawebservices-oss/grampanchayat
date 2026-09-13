import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ૧. વેબસાઇટ સેટિંગ્સ લોડ કરવા (ગામનું નામ અને ટેગલાઈન)
async function loadSettings() {
    const docRef = doc(db, "settings", "general");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // હેડર માટે
        if(data.name && document.getElementById("gp-name")) {
            document.getElementById("gp-name").innerText = data.name;
        }
        if(data.tagline && document.getElementById("gp-tagline")) {
            document.getElementById("gp-tagline").innerText = data.tagline;
        }

        // બેનર ઈમેજ પર બતાવવા માટે
        if(data.name && document.getElementById("banner-gp-name")) {
            document.getElementById("banner-gp-name").innerText = data.name;
        }
        if(data.tagline && document.getElementById("banner-gp-tagline")) {
            document.getElementById("banner-gp-tagline").innerText = data.tagline;
        }
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
                <div class="border-b border-red-400/40 pb-2 mb-2 last:border-b-0">
                    <h5 class="font-bold text-white text-sm md:text-base leading-snug">• ${item.title}</h5>
                    <p class="text-xs text-red-100 mt-1 leading-relaxed pl-3">${item.desc}</p>
                </div>
            `;
        }
    });

    if (!hasNotice) {
        noticeList.innerHTML = "<p class='text-xs text-red-200'>હાલ કોઈ નવી નોટિસ નથી.</p>";
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

// ૫. ફોટો ગેલેરી (Auto Scroll + Fullscreen Lightbox)
async function displayGallery() {
    const querySnapshot = await getDocs(collection(db, "gallery"));
    const container = document.getElementById("gallery-container");
    if(!container) return;
    container.innerHTML = "";
    
    if (querySnapshot.empty) {
        container.innerHTML = "<p class='text-xs text-gray-500'>હાલ કોઈ ફોટા ઉમેરેલા નથી.</p>";
        return;
    }

    querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
        container.innerHTML += `
            <div class="flex-none w-64 bg-slate-50 p-2 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition gallery-card" data-url="${item.imageUrl}">
                <img src="${item.imageUrl}" alt="${item.title}" class="h-40 w-full object-cover rounded pointer-events-none">
                <p class="text-xs font-bold text-center mt-2 text-gray-700 truncate">${item.title}</p>
            </div>
        `;
    });

    let scrollAmount = 0;
    let autoScrollInterval = setInterval(() => {
        if (container) {
            scrollAmount += 1.5;
            if (scrollAmount >= container.scrollWidth - container.clientWidth) {
                scrollAmount = 0;
            }
            container.scrollLeft = scrollAmount;
        }
    }, 30);

    container.addEventListener("mouseenter", () => clearInterval(autoScrollInterval));
    container.addEventListener("mouseleave", () => {
        autoScrollInterval = setInterval(() => {
            if (container) {
                scrollAmount += 1.5;
                if (scrollAmount >= container.scrollWidth - container.clientWidth) {
                    scrollAmount = 0;
                }
                container.scrollLeft = scrollAmount;
            }
        }, 30);
    });

    document.querySelectorAll(".gallery-card").forEach(card => {
        card.addEventListener("click", () => {
            const url = card.getAttribute("data-url");
            const modal = document.getElementById("image-modal");
            const modalImg = document.getElementById("modal-img");
            if (modal && modalImg) {
                modalImg.src = url;
                modal.classList.remove("hidden");
                modal.classList.add("flex");
            }
        });
    });
}

// ફુલસ્ક્રીન મોડલ બંધ કરવાનો કોડ
document.getElementById("close-modal-btn")?.addEventListener("click", () => {
    const modal = document.getElementById("image-modal");
    if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    }
});

document.getElementById("image-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "image-modal") {
        e.target.classList.add("hidden");
        e.target.classList.remove("flex");
    }
});

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

// મોબાઈલ મેન્યૂ Toggle
document.getElementById("mobile-menu-btn")?.addEventListener("click", () => {
    const mobileMenu = document.getElementById("mobile-menu");
    if (mobileMenu) {
        mobileMenu.classList.toggle("hidden");
    }
});

// ૭. સમય પત્રક લોડ કરવું
async function loadFrontendSchedule() {
    const container = document.getElementById("frontend-schedule-list");
    if (!container) return;

    const snap = await getDocs(collection(db, "panchayat_schedule"));
    container.innerHTML = "";

    if (snap.empty) {
        container.innerHTML = "<p class='text-center text-gray-500 py-4 text-sm'>કોઈ માહિતી ઉપલબ્ધ નથી.</p>";
        return;
    }

    snap.forEach(docSnap => {
        const item = docSnap.data();
        container.innerHTML += `
            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                <div class="flex justify-between items-start">
                    <div>
                        <h4 class="font-bold text-gray-900 text-base">${item.name}</h4>
                        <span class="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">${item.designation}</span>
                    </div>
                </div>
                <div class="text-xs text-gray-600 space-y-1 border-t pt-2">
                    <div><b>⏰ સમય:</b> ${item.timing}</div>
                    <div><b>📅 દિવસો:</b> ${item.days}</div>
                    ${item.note ? `<div class="text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 mt-1"><b>📌 નોંધ:</b> ${item.note}</div>` : ''}
                </div>
            </div>
        `;
    });
}

// ૮. પંચાયત બોડી મુદત અને નોંધ દર્શાવવી
async function displayStaffPageMeta() {
    const snap = await getDoc(doc(db, "panchayat_meta", "staff_page"));
    if (snap.exists()) {
        const data = snap.data();
        const termContainer = document.getElementById("display-term");
        const noteContainer = document.getElementById("display-note");

        if (termContainer && data.term) {
            termContainer.innerText = `પંચાયત મુદત: ${data.term}`;
        }
        if (noteContainer && data.note) {
            noteContainer.innerText = `નોંધ: ${data.note}`;
        }
    }
}

// ૯. 🆕 પંચાયત કમિટી અને સ્ટાફ સભ્યો વેબસાઇટ પર લોડ કરવા
async function loadFrontendCommitteeAndStaff() {
    const committeeContainer = document.getElementById("frontend-committee-list");
    const staffContainer = document.getElementById("frontend-staff-list");

    // A. કમિટી સભ્યો
    if (committeeContainer) {
        const snap = await getDocs(collection(db, "panchayat_committee"));
        committeeContainer.innerHTML = "";
        if (snap.empty) {
            committeeContainer.innerHTML = "<p class='text-xs text-gray-500'>કોઈ કમિટી સભ્ય ઉપલબ્ધ નથી.</p>";
        } else {
            snap.forEach(docSnap => {
                const item = docSnap.data();
                committeeContainer.innerHTML += `
                    <div class="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex justify-between items-center">
                        <div>
                            <h5 class="font-bold text-gray-800 text-sm">${item.name}</h5>
                            <p class="text-xs text-blue-700 font-medium">${item.designation}</p>
                            ${item.ward ? `<p class="text-[11px] text-gray-500">વોર્ડ નં: ${item.ward}</p>` : ''}
                        </div>
                        <a href="tel:${item.mobile}" class="bg-blue-50 text-blue-700 p-2 rounded-full hover:bg-blue-100 text-xs font-bold">
                            📞 ${item.mobile}
                        </a>
                    </div>
                `;
            });
        }
    }

    // B. સ્ટાફ / કર્મચારીઓ
    if (staffContainer) {
        const snap = await getDocs(collection(db, "panchayat_staff"));
        staffContainer.innerHTML = "";
        if (snap.empty) {
            staffContainer.innerHTML = "<p class='text-xs text-gray-500'>કોઈ સ્ટાફ માહિતી ઉપલબ્ધ નથી.</p>";
        } else {
            snap.forEach(docSnap => {
                const item = docSnap.data();
                staffContainer.innerHTML += `
                    <div class="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex justify-between items-center">
                        <div>
                            <h5 class="font-bold text-gray-800 text-sm">${item.name}</h5>
                            <p class="text-xs text-emerald-700 font-medium">${item.designation}</p>
                        </div>
                        <a href="tel:${item.mobile}" class="bg-emerald-50 text-emerald-700 p-2 rounded-full hover:bg-emerald-100 text-xs font-bold">
                            📞 ${item.mobile}
                        </a>
                    </div>
                `;
            });
        }
    }
}

// ૧૦. પબ્લિક વિગતોનો ડ્રોપડાઉન મેનૂ
async function loadVillageDetailsMenu() {
    const snap = await getDocs(collection(db, "village_details"));
    const container = document.getElementById("village-details-menu-list");
    if (!container) return;

    container.innerHTML = "";
    snap.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.isShow !== false) {
            container.innerHTML += `
                <a href="details.html?id=${docSnap.id}" target="_blank" class="flex items-center gap-2 p-2 rounded-lg hover:bg-purple-50 text-purple-900 font-medium text-sm transition border-b border-purple-100">
                    <i class="fa-solid fa-chevron-right text-xs text-purple-600"></i>
                    <span>${item.title}</span>
                </a>
            `;
        }
    });
}

// 🚀 બધા ફંક્શન્સ કોલ કરવા
loadSettings();
loadPosts();
loadNotices();
displayHistory();
displayGallery();
loadFrontendSchedule();
displayStaffPageMeta();
loadFrontendCommitteeAndStaff(); // 👈 કમિટી/સ્ટાફ કોલ ઉમેર્યો
loadVillageDetailsMenu();
