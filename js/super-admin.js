import { db } from "./js/firebase-config.js";
import { doc, setDoc, getDoc, collection, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. Maintenance Mode Manager
const maintModeSelect = document.getElementById("maint-mode-select");
const maintMsgInput = document.getElementById("maint-msg-input");
const saveMaintBtn = document.getElementById("save-maint-btn");

// Load existing maintenance settings
async function loadMaintenanceSettings() {
    try {
        const snap = await getDoc(doc(db, "system_settings", "global_config"));
        if (snap.exists()) {
            const data = snap.data();
            maintModeSelect.value = data.isMaintenance ? "true" : "false";
            maintMsgInput.value = data.maintenanceMessage || "";
        }
    } catch (err) {
        console.error("Error loading system settings:", err);
    }
}

// Save maintenance settings
saveMaintBtn?.addEventListener("click", async () => {
    try {
        const isMaintenance = maintModeSelect.value === "true";
        const maintenanceMessage = maintMsgInput.value.trim();

        await setDoc(doc(db, "system_settings", "global_config"), {
            isMaintenance,
            maintenanceMessage,
            updatedAt: new Date()
        });

        alert("ડેવલપર મેન્ટેનન્સ સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગયા!");
    } catch (err) {
        console.error("Error saving maintenance settings:", err);
        alert("સેટિંગ્સ સેવ કરવામાં ભૂલ આવી.");
    }
});

// Helper for generating unique ID safely (ફક્ત એક જ વાર ડિક્લેર કરેલું છે)
function generateDocId(district, taluka, panchayat) {
    const cleanStr = (str) => str ? str.toLowerCase().trim().replace(/\s+/g, "_").replace(/[^\w_]/g, "") : "";
    return `${cleanStr(district)}_${cleanStr(taluka)}_${cleanStr(panchayat)}_${Date.now()}`;
}

// 2. Add New Panchayat Form Handler
const addForm = document.getElementById("add-panchayat-form");
addForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
        const district = document.getElementById("p-district").value.trim();
        const taluka = document.getElementById("p-taluka").value.trim();
        const panchayatName = document.getElementById("p-name").value.trim();
        const phone = document.getElementById("p-phone").value.trim();
        const isActive = document.getElementById("p-status").value === "true";

        const docId = generateDocId(district, taluka, panchayatName);

        await setDoc(doc(db, "panchayats", docId), {
            district,
            taluka,
            panchayatName,
            phone,
            isActive,
            createdAt: new Date()
        });

        alert(`${panchayatName} ગ્રામ પંચાયત સફળતાપૂર્વક ઉમેરાઈ ગઈ!`);
        addForm.reset();
    } catch (err) {
        console.error("Error adding panchayat:", err);
        alert("પંચાયત ઉમેરવામાં ભૂલ આવી: " + err.message);
    }
});

// 3. Real-time List Render & Toggle Status
let allPanchayats = [];

onSnapshot(collection(db, "panchayats"), (snapshot) => {
    allPanchayats = [];
    snapshot.forEach(docSnap => {
        allPanchayats.push({ id: docSnap.id, ...docSnap.data() });
    });

    const totalCountEl = document.getElementById("total-panchayats-count");
    if (totalCountEl) {
        totalCountEl.textContent = `કુલ પંચાયતો: ${allPanchayats.length}`;
    }
    renderPanchayatTable(allPanchayats);
});

function renderPanchayatTable(list) {
    const tbody = document.getElementById("panchayat-table-body");
    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">કોઈ પંચાયત મળી નથી.</td></tr>`;
        return;
    }

    const baseUrl = window.location.origin + window.location.pathname.replace("super-admin.html", "index.html");

    tbody.innerHTML = list.map(item => {
        const shareUrl = `${baseUrl}?id=${item.id}`;
        return `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-2.5 font-semibold text-gray-800">${item.district || '-'} / ${item.taluka || '-'}</td>
                <td class="p-2.5 font-bold text-emerald-800">
                    ${item.panchayatName || '-'}
                    <div class="text-[10px] text-gray-500 font-normal">ફોન: ${item.phone || '-'} | ID: ${item.id}</div>
                </td>
                <td class="p-2.5 text-center">
                    <button onclick="togglePanchayatStatus('${item.id}', ${item.isActive})" 
                        class="px-3 py-1 rounded-full text-[10px] font-bold shadow transition ${item.isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}">
                        ${item.isActive ? 'Active (ON)' : 'Deactive (OFF)'}
                    </button>
                </td>
                <td class="p-2.5 text-center space-x-1">
                    <a href="${shareUrl}" target="_blank" class="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded font-bold hover:bg-blue-100 text-[11px]" title="વેબસાઇટ ખોલો">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> ખોલો
                    </a>
                    <button onclick="copyPanchayatLink('${shareUrl}')" class="bg-slate-100 text-slate-700 border border-slate-300 px-2 py-1 rounded font-bold hover:bg-slate-200 text-[11px]" title="લિંક કોપી કરો">
                        <i class="fa-solid fa-copy"></i> લિંક કોપી
                    </button>
                    <a href="admin.html?id=${item.id}" target="_blank" class="inline-block bg-purple-50 text-purple-700 border border-purple-200 px-2 py-1 rounded font-bold hover:bg-purple-100 text-[11px]" title="એડમિન કંટ્રોલ પેનલ">
                        <i class="fa-solid fa-gear"></i> એડમિન
                    </a>
                </td>
            </tr>
        `;
    }).join("");
}

// Global function to toggle active status
window.togglePanchayatStatus = async (id, currentStatus) => {
    try {
        await updateDoc(doc(db, "panchayats", id), {
            isActive: !currentStatus
        });
    } catch (err) {
        console.error("Error updating status:", err);
    }
};

// Global function to Copy Shareable Link
window.copyPanchayatLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
        alert("ગ્રામ પંચાયતની વેબસાઇટ લિંક કોપી થઈ ગઈ છે!\n\n" + link);
    }).catch(err => {
        console.error("Copy failed:", err);
    });
};

// Filter Search
document.getElementById("search-input")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = allPanchayats.filter(p => 
        (p.district && p.district.toLowerCase().includes(query)) ||
        (p.taluka && p.taluka.toLowerCase().includes(query)) ||
        (p.panchayatName && p.panchayatName.toLowerCase().includes(query))
    );
    renderPanchayatTable(filtered);
});

loadMaintenanceSettings();
