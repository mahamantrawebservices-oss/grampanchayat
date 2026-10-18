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

// Helper for generating unique ID
function generateDocId(district, taluka, panchayat) {
    return `${district}_${taluka}_${panchayat}`
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^\w_]/g, "");
}

// 2. Add New Panchayat
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

        await setDoc(doc(doc(db, "panchayats"), docId), {
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
        alert("પંચાયત ઉમેરવામાં ભૂલ આવી.");
    }
});

// 3. Real-time List Render & Toggle Status
let allPanchayats = [];

onSnapshot(collection(db, "panchayats"), (snapshot) => {
    allPanchayats = [];
    snapshot.forEach(docSnap => {
        allPanchayats.push({ id: docSnap.id, ...docSnap.data() });
    });

    document.getElementById("total-panchayats-count").textContent = `કુલ પંચાયતો: ${allPanchayats.length}`;
    renderPanchayatTable(allPanchayats);
});

function renderPanchayatTable(list) {
    const tbody = document.getElementById("panchayat-table-body");
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">કોઈ પંચાયત મળી નથી.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => `
        <tr class="border-b hover:bg-slate-50">
            <td class="p-2.5 font-semibold text-gray-800">${item.district || '-'} / ${item.taluka || '-'}</td>
            <td class="p-2.5 font-bold text-emerald-800">${item.panchayatName || '-'}</td>
            <td class="p-2.5 text-gray-600">${item.phone || '-'}</td>
            <td class="p-2.5 text-center">
                <button onclick="togglePanchayatStatus('${item.id}', ${item.isActive})" 
                    class="px-3 py-1 rounded-full text-[10px] font-bold shadow ${item.isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-red-100 text-red-800 border border-red-300'}">
                    ${item.isActive ? 'Active (ON)' : 'Deactive (OFF)'}
                </button>
            </td>
            <td class="p-2.5 text-center">
                <a href="proactive.html?id=${item.id}" target="_blank" class="text-blue-600 hover:underline font-bold">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i> જુઓ
                </a>
            </td>
        </tr>
    `).join("");
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
