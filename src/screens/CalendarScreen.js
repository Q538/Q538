import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Modal, ActivityIndicator, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useState, useEffect } from "react";
import { COLORS } from "../theme/colors";
import { getAssignments, getAgents, getPresence, getCalendarNotes, saveCalendarNotes, addAlert } from "../services/database";
import { Picker } from "@react-native-picker/picker";

const { width } = Dimensions.get("window");

export default function CalendarScreen({ selectedGrup, updateSelectedGrup, session, initialDate, initialEditTip, initialStatus, clearInitialDate }) {
    const [policeYear, setPoliceYear] = useState(2026);
    const [selectedDayData, setSelectedDayData] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isUserModalVisible, setIsUserModalVisible] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [userNote, setUserNote] = useState("");
    const [selectedStatuses, setSelectedStatuses] = useState([]);
    const [perllongamentData, setPerllongamentData] = useState({
        diligencies: "",
        motiu: "",
        horaInici: "00:00",
        horaFi: "00:00",
        dataFi: "",
        agents: []
    });
    const [newAgentTip, setNewAgentTip] = useState("");
    const [perllTipInici, setPerllTipInici] = useState("");
    const [perllHoraInici, setPerllHoraInici] = useState("");
    const [perllDataInici, setPerllDataInici] = useState("");
    const [perllTipFi, setPerllTipFi] = useState("");
    const [perllHoraFi, setPerllHoraFi] = useState("");
    const [perllDataFi, setPerllDataFi] = useState("");
    const [isFullDay, setIsFullDay] = useState(false);
    const [partialData, setPartialData] = useState({ start: "00:00", end: "00:00" });
    const [judiciData, setJudiciData] = useState({
        hora: "09:00",
        jutjat: "Instrucció",
        numJutgat: "",
        diligencies: "",
        sala: "",
        agents: []
    });
    const [romanentData, setRomanentData] = useState({
        type: "MATÍ", // MATÍ, TARDA, NIT, ESPECIAL
        start: "06:00",
        end: "14:30"
    });
    const [calendarNotes, setCalendarNotes] = useState({});
    const [isStatusSelectorVisible, setIsStatusSelectorVisible] = useState(false);
    const [existingDayStatuses, setExistingDayStatuses] = useState([]);
    const [activeEditingStatus, setActiveEditingStatus] = useState(null);
    const [isUserDetailModalVisible, setIsUserDetailModalVisible] = useState(false);
    const [detailUser, setDetailUser] = useState(null); // { tip, nom, categoria }
    const [actingAsUser, setActingAsUser] = useState(null);
    const [actingAsNom, setActingAsNom] = useState(null);
    const [currentModifiedByAdmin, setCurrentModifiedByAdmin] = useState(false);
    const [rangeData, setRangeData] = useState({ start: "", end: "" });
    const [isUnknownEnd, setIsUnknownEnd] = useState(false);
    const isAdmin = session?.perfil === "ADMIN";
    const userGrup = session?.grup;
    const userTip = session?.user?.tip ? String(session.user.tip).trim() : "";

    const STATUS_ROW1 = ["JUDICI", "PERLLONGAMENT", "PERMÍS", "AP"];
    const STATUS_ROW2 = ["VACANCES", "BAIXA", "ALTRES", "ROMANENT"];
    const STATUS_COLORS = {
        "PERLLONGAMENT": { bg: "#424242", text: "white" },
        "PERMÍS": { bg: "#C8E6C9", text: "#1B5E20" },
        "AP": { bg: "#FFCDD2", text: "#D32F2F" },
        "BAIXA": { bg: "#D32F2F", text: "white" },
        "VACANCES": { bg: "#2E7D32", text: "white" },
        "JUDICI": { bg: "#1565C0", text: "white" },
        "ALTRES": { bg: "#E1BEE7", text: "#4A148C" },
        "ROMANENT": { bg: "#0D47A1", text: "white" } // Blau fort
    };

    const STATUS_LIGHT_COLORS = {
        "PERLLONGAMENT": "rgba(66, 66, 66, 0.4)",
        "PERMÍS": "rgba(46, 125, 50, 0.4)",
        "AP": "rgba(211, 47, 47, 0.4)",
        "BAIXA": "rgba(211, 47, 47, 0.4)",
        "VACANCES": "rgba(46, 125, 50, 0.4)",
        "JUDICI": "rgba(21, 101, 192, 0.4)",
        "ALTRES": "rgba(106, 27, 154, 0.4)",
        "ROMANENT": "rgba(13, 71, 161, 0.4)"
    };

    useEffect(() => {
        loadNotes();
    }, []);

    useEffect(() => {
        if (initialDate) {
            const dateObj = new Date(initialDate);
            if (!isNaN(dateObj.getTime())) {
                // Ajustem l'any del calendari si cal
                setPoliceYear(dateObj.getFullYear());

                if (initialEditTip && (!isAdmin || initialStatus)) {
                    // Si venim d'un lloc on ja sabem el TIP (i opcionalment el status), obrim el detall directament
                    openUserDayDetails(dateObj, initialStatus, initialEditTip);
                } else {
                    // Per defecte obrim la vista resumida del dia
                    handleDayPress(dateObj);
                }
            }

            // Netegem la data per no re-obrir el modal al girar o carregar
            if (clearInitialDate) clearInitialDate();
        }
    }, [initialDate, initialEditTip, initialStatus]);

    const loadNotes = async () => {
        const notes = await getCalendarNotes();
        setCalendarNotes(notes || {});
    };

    // Secuencia real Q5 corregida: 
    // Setmana 1: Tardes (L-V tardes, S-D lliure) -> TTTTTFF
    // Setmana 2: NITS (Dilluns-Diumenge) -> NNNNNNN
    // Setmana 3: FESTA (Dilluns-Diumenge) -> FFFFFFF
    // Setmana 4: MATINS (Dilluns-Diumenge) -> MMMMMMM
    // Setmana 5: FESTA (Dilluns-Diumenge) -> FFFFFFF
    const pattern = "TTTTTFFNNNNNNNFFFFFFFMMMMMMMFFFFFFF";

    const turns = {
        "M": { color: COLORS.MATI, label: "M", full: "Matí" },
        "T": { color: COLORS.TARDA, label: "T", full: "Tarda" },
        "N": { color: COLORS.NIT, label: "N", full: "Nit" },
        "F": { color: COLORS.FESTA, label: "F", full: "Festa" },
    };

    const getTurnForDate = (date) => {
        if (!date || isNaN(date.getTime())) return 'F';
        // DATA DE REFERÈNCIA FIXA: Dilluns 2 de febrer de 2026 a les 12:00
        const referenceDate = new Date(2026, 1, 2, 12, 0, 0);

        // Forcem les 12:00 per evitar problemes amb el canvi d'hora (DST)
        const calcDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);

        const diffTime = calcDate.getTime() - referenceDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        // L'ESC4 comença NITS el 2 de febrer (Index 7)
        const startPoint = 7;

        // Ajust segons la cadena d'escamots:
        // ESC4 és la referència. ESC5 fa el que l'ESC4 deixa (-1 setmana). ESC3 és el d'abans (+1 setmana).
        // Fórmula: (4 - seleccionado) * 7
        const escamotOffset = (4 - (selectedGrup || 4)) * 7;

        const cyclePosition = (diffDays + startPoint + escamotOffset + 35000) % 35;

        return pattern[cyclePosition] || 'F';
    };

    const getShiftHours = (date, turn) => {
        if (!date || isNaN(date.getTime()) || !turn) return { start: "00:00", end: "00:00" };
        const day = date.getDay(); // 0: Dg, 1: Dl, ..., 6: Ds
        const isWeekend = (day === 0 || day === 6);

        if (turn === "M") {
            return isWeekend ? { start: "06:00", end: "18:00" } : { start: "06:00", end: "14:30" };
        }
        if (turn === "T") {
            return isWeekend ? { start: "00:00", end: "00:00" } : { start: "14:00", end: "22:30" };
        }
        if (turn === "N") {
            return isWeekend ? { start: "18:00", end: "06:00" } : { start: "22:00", end: "06:30" };
        }
        return { start: "00:00", end: "00:00" };
    };

    const openUserDayDetails = (date, specificStatus = null, targetTip = null, targetNom = null) => {
        try {
            const finalTip = (targetTip || actingAsUser || userTip || "").trim();
            if (targetTip) setActingAsUser(targetTip);
            if (targetNom) setActingAsNom(targetNom);

            if (!date || isNaN(date.getTime())) return;

            const dateStr = date.toDateString();
            const initialDayData = {
                date,
                dateLabel: date ? date.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ""
            };
            setSelectedDayData(initialDayData);
            const d = date.getDate().toString().padStart(2, '0');
            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const y = date.getFullYear();
            const defaultDateStr = `${d}/${m}/${y}`;

            const dayDataMap = calendarNotes[dateStr] || {};

            // Búsqueda del TIP (ignorando espacios)
            let userDayData = null;
            for (const key in dayDataMap) {
                if (String(key).trim() === finalTip) {
                    userDayData = dayDataMap[key];
                    break;
                }
            }

            const turn = getTurnForDate(date);
            const refHours = getShiftHours(date, turn);

            // Valores por defecto
            let note = "";
            let statuses = [];
            let range = { start: defaultDateStr, end: defaultDateStr };
            let isUnknown = false;
            let modified = false;
            let full = specificStatus === "PERMÍS" || specificStatus === "AP" || specificStatus === "ALTRES";
            let partial = { start: refHours.start, end: refHours.end };
            let perll = { diligencies: "", motiu: "", agents: [] };
            let judici = { hora: "09:00", jutjat: "Instrucció", numJutgat: "", diligencies: "", sala: "", agents: [] };
            let romanent = { type: "MATÍ", start: "06:00", end: "14:30" };

            if (userDayData && typeof userDayData === 'object') {
                note = userDayData.note || "";
                statuses = userDayData.statuses || (userDayData.status ? [userDayData.status] : []);
                if (userDayData.range) {
                    range = userDayData.range;
                    isUnknown = !!userDayData.range.isUnknownEnd;
                }
                modified = !!userDayData.modifiedByAdmin;

                // Buscar datos específicos del estado seleccionado
                let stForData = (specificStatus || (statuses.length === 1 ? statuses[0] : null));
                let stKey = stForData ? String(stForData).toLowerCase() : "";

                // Normalización manual básica si normalize no existe
                stKey = stKey.replace(/í/g, "i").replace(/é/g, "e").replace(/á/g, "a");

                const specificData = userDayData[stKey] || null;

                if (specificData && specificData.fullDay !== undefined) {
                    full = !!specificData.fullDay;
                    if (specificData.partial) partial = specificData.partial;
                } else if (userDayData.fullDay !== undefined) {
                    full = !!userDayData.fullDay;
                    if (userDayData.partial) partial = userDayData.partial;
                }

                if (userDayData.perllongament) perll = userDayData.perllongament;
                if (userDayData.judici) judici = userDayData.judici;
                if (userDayData.romanent) romanent = userDayData.romanent;
            }

            // Actualizar estados
            setUserNote(note);
            setSelectedStatuses(specificStatus ? [specificStatus] : (statuses.length === 1 ? statuses : []));
            setRangeData(range);
            setIsUnknownEnd(isUnknown);
            setCurrentModifiedByAdmin(modified);
            setIsFullDay(full);
            setPartialData(partial);
            setPerllongamentData(perll);
            setJudiciData(judici);
            setRomanentData(romanent);

            // Preparar campos auxiliares de perllongament
            setPerllTipInici("");
            setPerllHoraInici(refHours.start);
            setPerllDataInici(defaultDateStr);
            setPerllTipFi("");
            setPerllHoraFi(refHours.end);

            let dataFi = defaultDateStr;
            const hh = parseInt((refHours.end || "00:00").split(':')[0]);
            if (hh >= 18 || hh < 8) {
                const tomorrow = new Date(date);
                tomorrow.setDate(date.getDate() + 1);
                dataFi = `${tomorrow.getDate().toString().padStart(2, '0')}/${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}/${tomorrow.getFullYear()}`;
            }
            setPerllDataFi(dataFi);

            setActiveEditingStatus(specificStatus);
            setNewAgentTip("");
            setIsUserModalVisible(true);
        } catch (error) {
            console.error("Crash in openUserDayDetails:", error);
            // Fallback total para no bloquear al usuario
            setIsUserModalVisible(true);
        }
    };

    const handleDayPress = async (date) => {
        const dateStr = date.toDateString();

        if (isAdmin) {
            setSelectedDayData(null);
            setLoadingDetails(true);
            setIsModalVisible(true);

            try {
                const assignments = await getAssignments();
                const presence = await getPresence();
                const agents = await getAgents(selectedGrup);
                const allNotes = await getCalendarNotes();
                const dayNotes = allNotes[dateStr] || {};

                const dayAssignments = assignments[dateStr] || {};
                const dayAbsences = presence[dateStr] || [];

                const addedTips = new Set();
                Object.values(dayAssignments).flat().forEach(tip => addedTips.add(String(tip)));
                Object.keys(dayAssignments).forEach(key => {
                    if (key.startsWith('MANDO_')) addedTips.add(key.replace('MANDO_', ''));
                });
                dayAbsences.forEach(tip => addedTips.add(String(tip)));
                Object.keys(dayNotes).forEach(tip => addedTips.add(String(tip)));

                const details = Array.from(addedTips).map(tip => {
                    const agent = agents.find(a => String(a.tip) === tip);
                    let service = "-";
                    if (dayAssignments) {
                        for (const srvId in dayAssignments) {
                            if (srvId.startsWith('MANDO_')) {
                                const mandoTip = srvId.replace('MANDO_', '');
                                if (mandoTip === tip) service = "MANDO / GAUDI 100";
                                else if (dayAssignments[srvId] && dayAssignments[srvId].includes(tip)) service = "BINOMI MANDO";
                            } else if (dayAssignments[srvId] && dayAssignments[srvId].includes(tip)) {
                                service = srvId.replace('_RESP', ' (R)');
                            }
                        }
                    }

                    if (dayAbsences && dayAbsences.includes(tip)) service = "ABSÈNCIA / PERMÍS";

                    const savedData = dayNotes ? dayNotes[tip] : null;
                    let displayNote = "";
                    let displayStatuses = [];
                    let displayPerllongament = null;
                    let displayFullDay = false;
                    let displayPartial = null;

                    if (typeof savedData === 'object' && savedData !== null) {
                        displayNote = savedData.note || "";
                        displayStatuses = savedData.statuses || (savedData.status ? [savedData.status] : []);
                        displayPerllongament = savedData.perllongament || null;
                        displayFullDay = savedData.fullDay || false;
                        displayPartial = savedData.partial || null;
                    } else {
                        displayNote = savedData || "";
                    }

                    return {
                        tip,
                        nom: agent?.nom || "Agent Manual",
                        categoria: agent?.categoria || "AGENT",
                        service,
                        note: displayNote,
                        status: displayStatuses.length > 0 ? displayStatuses[0] : null,
                        statuses: displayStatuses,
                        perllongament: displayPerllongament,
                        fullDay: displayFullDay,
                        partial: displayPartial,
                        permis: savedData?.permis || null,
                        ap: savedData?.ap || null,
                        altres: savedData?.altres || null,
                        modifiedByAdmin: savedData?.modifiedByAdmin || false
                    };
                });

                const catOrder = { "SERGENT": 0, "CAPORAL": 1, "AGENT": 2 };
                details.sort((a, b) => {
                    const hasPermA = a.status && a.status !== "-";
                    const hasPermB = b.status && b.status !== "-";
                    if (hasPermA && !hasPermB) return -1;
                    if (!hasPermA && hasPermB) return 1;

                    const orderA = catOrder[a.categoria] ?? 2;
                    const orderB = catOrder[b.categoria] ?? 2;
                    if (orderA !== orderB) return orderA - orderB;
                    return String(a.tip || "").localeCompare(String(b.tip || ""));
                });

                setSelectedDayData({
                    date,
                    dateLabel: date ? date.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : "",
                    details: details || []
                });
            } catch (error) {
                console.error("Error loading day details:", error);
            } finally {
                setLoadingDetails(false);
            }
        } else {
            try {
                const initialDayData = {
                    date,
                    dateLabel: date ? date.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ""
                };
                setSelectedDayData(initialDayData);

                const dayDataMap = calendarNotes[dateStr] || {};
                const uTip = String(userTip || "").trim();

                // Búsqueda robusta del TIP en el mapa de notas del día
                let foundTipKey = null;
                if (uTip) {
                    foundTipKey = Object.keys(dayDataMap).find(k => String(k).trim() === uTip);
                }

                const userDayData = foundTipKey ? dayDataMap[foundTipKey] : null;

                const statuses = (userDayData && typeof userDayData === 'object') ? (userDayData.statuses || (userDayData.status ? [userDayData.status] : [])) : [];

                if (statuses.length >= 1) {
                    setExistingDayStatuses(statuses);
                    setIsStatusSelectorVisible(true);
                } else {
                    openUserDayDetails(date, null);
                }
            } catch (error) {
                console.error("Error in handleDayPress (User):", error);
                // Si falla la detección, abrimos el formulario vacío para no bloquear al usuario
                openUserDayDetails(date, null);
            }
        }
    };

    const formatTimeInput = (text) => {
        let cleaned = text.replace(/[^0-9]/g, "");
        if (cleaned.length >= 2) {
            cleaned = cleaned.slice(0, 2) + ":" + cleaned.slice(2, 4);
        }
        return cleaned.slice(0, 5);
    };

    const formatDateInput = (text) => {
        let cleaned = text.replace(/[^0-9]/g, "");
        if (cleaned.length >= 2 && cleaned.length < 4) {
            cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
        } else if (cleaned.length >= 4 && cleaned.length < 9) {
            cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4) + "/" + cleaned.slice(4);
        } else if (cleaned.length >= 8) {
            cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4) + "/" + cleaned.slice(4, 8);
        }
        return cleaned.slice(0, 10);
    };

    const handleSaveUserNote = async () => {
        const finalTip = actingAsUser || userTip;
        if (!finalTip) {
            Alert.alert("Error", "No s'ha pogut identificar el TIP.");
            return;
        }

        // Validación de campos obligatorios para JUDICI
        if (selectedStatuses.includes("JUDICI")) {
            if (!judiciData.hora || !judiciData.hora.trim()) {
                Alert.alert("Camp Obligatori", "Has d'introduir l'hora del judici.");
                return;
            }
            if (!judiciData.jutjat || judiciData.jutjat === "Instrucció") {
                // Si no se ha cambiado del valor por defecto, pedimos que lo seleccione
                if (!judiciData.jutjat) {
                    Alert.alert("Camp Obligatori", "Has de seleccionar el tipus de jutjat.");
                    return;
                }
            }
            if (!judiciData.numJutjat || !judiciData.numJutjat.trim()) {
                Alert.alert("Camp Obligatori", "Has d'introduir el número del jutjat.");
                return;
            }
            if (!judiciData.sala || !judiciData.sala.trim()) {
                Alert.alert("Camp Obligatori", "Has d'introduir la sala del jutjat.");
                return;
            }
            if (!judiciData.agents || judiciData.agents.length === 0) {
                Alert.alert("Camp Obligatori", "Has d'afegir almenys un agent al judici.");
                return;
            }
        }

        const dateStr = selectedDayData.date.toDateString();
        const existingEntry = calendarNotes[dateStr]?.[finalTip];
        const isNew = !existingEntry || (existingEntry.statuses?.length === 0 && !existingEntry.note);

        if (!isNew) {
            Alert.alert(
                "Confirmació",
                "Estàs segur que vols guardar els canvis?",
                [
                    { text: "CANCEL·LAR", style: "cancel" },
                    { text: "GUARDAR", onPress: () => processSave(finalTip, dateStr) }
                ]
            );
        } else {
            processSave(finalTip, dateStr);
        }
    };

    const processSave = async (finalTip, dateStr) => {
        const currentNotes = { ...calendarNotes };

        const parseDate = (dStr) => {
            if (!dStr) return null;
            const parts = dStr.split('/');
            if (parts.length !== 3) return null;
            // Assumim 20XX per dates de 2 dígits
            const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
            return new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
        };

        // --- NOU: Netetja de rang previ si estem editant VACANCES o BAIXA ---
        if (activeEditingStatus === "VACANCES" || activeEditingStatus === "BAIXA") {
            const originalData = calendarNotes[dateStr]?.[finalTip];
            if (originalData && originalData.range) {
                const oldR = originalData.range;
                Object.keys(currentNotes).forEach(dKey => {
                    const entry = currentNotes[dKey]?.[finalTip];
                    if (entry && entry.range &&
                        entry.range.start === oldR.start &&
                        entry.range.end === oldR.end &&
                        entry.range.isUnknownEnd === oldR.isUnknownEnd) {

                        entry.statuses = (entry.statuses || []).filter(s => s !== activeEditingStatus);
                        if (entry.statuses.length === 0 && (!entry.note || !entry.note.trim())) {
                            delete currentNotes[dKey][finalTip];
                            if (Object.keys(currentNotes[dKey]).length === 0) delete currentNotes[dKey];
                        } else {
                            if (!entry.statuses.includes(activeEditingStatus)) delete entry.range;
                        }
                    }
                });
            }
        }

        let datesToUpdate = [dateStr];

        // Si és VACANCES o BAIXA i hi ha rang, generem la llista de dates
        if ((selectedStatuses.includes("VACANCES") || selectedStatuses.includes("BAIXA")) && rangeData.start && (rangeData.end || isUnknownEnd)) {
            const start = parseDate(rangeData.start);
            let end = parseDate(rangeData.end);

            if (isUnknownEnd && start) {
                // "Eternamente" -> 3 anys al futur
                end = new Date(start);
                end.setFullYear(end.getFullYear() + 3);
            }

            if (start && end && start <= end) {
                datesToUpdate = [];
                let curr = new Date(start);
                while (curr <= end) {
                    datesToUpdate.push(curr.toDateString());
                    curr.setDate(curr.getDate() + 1);
                }
            }
        }

        for (const targetDateStr of datesToUpdate) {
            if (!currentNotes[targetDateStr]) currentNotes[targetDateStr] = {};

            if (userNote.trim() || selectedStatuses.length > 0 || activeEditingStatus) {
                const existing = currentNotes[targetDateStr][finalTip] || { statuses: [], note: "" };

                // Lògica Additiva: si hi ha un estat seleccionat, l'afegim/actualitzem als existents
                let newStatuses = [...(existing.statuses || [])];
                if (selectedStatuses.length > 0) {
                    const targetStatus = selectedStatuses[0];
                    if (!newStatuses.includes(targetStatus)) {
                        newStatuses.push(targetStatus);
                    }
                } else if (activeEditingStatus) {
                    newStatuses = newStatuses.filter(s => s !== activeEditingStatus);
                }

                if (newStatuses.length === 0 && !userNote.trim()) {
                    delete currentNotes[targetDateStr][finalTip];
                    if (Object.keys(currentNotes[targetDateStr]).length === 0) delete currentNotes[targetDateStr];
                } else {
                    const currentJudici = (selectedStatuses.includes("JUDICI")) ? judiciData : (activeEditingStatus === "JUDICI" ? null : (existing.judici || null));
                    const currentPerllongament = (selectedStatuses.includes("PERLLONGAMENT")) ? perllongamentData : (activeEditingStatus === "PERLLONGAMENT" ? null : (existing.perllongament || null));

                    const isPermisSelected = selectedStatuses.includes("PERMÍS");
                    const isApSelected = selectedStatuses.includes("AP");
                    const isAltresSelected = selectedStatuses.includes("ALTRES");
                    const isRomanentSelected = selectedStatuses.includes("ROMANENT");

                    const newFullDay = (isPermisSelected || isApSelected || isAltresSelected) ? isFullDay : (existing.fullDay || false);
                    const newPartial = ((isPermisSelected || isApSelected || isAltresSelected) && !isFullDay) ? partialData : (existing.partial || null);
                    const currentRomanent = isRomanentSelected ? romanentData : (activeEditingStatus === "ROMANENT" ? null : (existing.romanent || null));

                    currentNotes[targetDateStr][finalTip] = {
                        statuses: newStatuses,
                        note: userNote.trim(),
                        perllongament: currentPerllongament,
                        judici: currentJudici,
                        fullDay: newFullDay,
                        partial: newPartial,
                        romanent: currentRomanent,
                        range: (selectedStatuses.includes("VACANCES") || selectedStatuses.includes("BAIXA")) ? { ...rangeData, isUnknownEnd } : (activeEditingStatus === "VACANCES" || activeEditingStatus === "BAIXA" ? null : (existing.range || null)),
                        modifiedByAdmin: !!actingAsUser || existing.modifiedByAdmin || false,
                        permis: (isPermisSelected ? { fullDay: isFullDay, partial: isFullDay ? null : partialData } : (activeEditingStatus === "PERMÍS" ? null : (existing.permis || null))),
                        ap: (isApSelected ? { fullDay: isFullDay, partial: isFullDay ? null : partialData } : (activeEditingStatus === "AP" ? null : (existing.ap || null))),
                        altres: (isAltresSelected ? { fullDay: isFullDay, partial: isFullDay ? null : partialData } : (activeEditingStatus === "ALTRES" ? null : (existing.altres || null)))
                    };

                    // FUSION LOGIC (només per al dia seleccionat originalment o si volem sincronitzar un judici/perl en rang - normalment range és només VAC/BAIXA)
                    const dayEntries = currentNotes[targetDateStr];

                    // Fusion for JUDICI
                    if (currentJudici && currentJudici.diligencies) {
                        Object.keys(dayEntries).forEach(tip => {
                            const entry = dayEntries[tip];
                            if (entry.judici && entry.judici.diligencies === currentJudici.diligencies) {
                                // Merge agents lists, keeping only unique tips
                                const combinedAgents = [...new Set([
                                    ...(currentJudici.agents || []).map(a => typeof a === 'object' ? a.tip : a),
                                    ...(entry.judici.agents || []).map(a => typeof a === 'object' ? a.tip : a),
                                    String(userTip),
                                    String(tip)
                                ])];

                                const mergedJudici = { ...currentJudici, agents: combinedAgents };
                                entry.judici = mergedJudici;
                                if (!!actingAsUser) entry.modifiedByAdmin = true;
                                if (!entry.statuses.includes("JUDICI")) entry.statuses.push("JUDICI");

                                // Also update the current target user's entry with the merged data
                                currentNotes[targetDateStr][finalTip].judici = mergedJudici;
                            }
                        });
                    }

                    // Fusion for PERLLONGAMENT
                    if (currentPerllongament && currentPerllongament.diligencies) {
                        Object.keys(dayEntries).forEach(tip => {
                            const entry = dayEntries[tip];
                            if (entry.perllongament && entry.perllongament.diligencies === currentPerllongament.diligencies) {
                                const agentMap = new Map();
                                [...(entry.perllongament.agents || []), ...(currentPerllongament.agents || [])].forEach(a => {
                                    const t = (typeof a === 'object' && a !== null) ? String(a.tip) : String(a);
                                    if (t && t !== 'null' && t !== 'undefined') {
                                        if (!agentMap.has(t) || (typeof a === 'object' && typeof agentMap.get(t) !== 'object')) {
                                            agentMap.set(t, a);
                                        }
                                    }
                                });
                                [String(finalTip), String(tip)].forEach(t => {
                                    if (t && t !== 'null' && t !== 'undefined' && !agentMap.has(t)) {
                                        agentMap.set(t, t);
                                    }
                                });
                                const mergedPerl = { ...currentPerllongament, agents: Array.from(agentMap.values()) };
                                entry.perllongament = mergedPerl;
                                if (!!actingAsUser) entry.modifiedByAdmin = true;
                                if (!entry.statuses.includes("PERLLONGAMENT")) entry.statuses.push("PERLLONGAMENT");

                                currentNotes[targetDateStr][finalTip].perllongament = mergedPerl;
                            }
                        });
                    }
                }
            }
        }

        // Sincronització per al primer dia (o el seleccionat)
        const firstTarget = datesToUpdate[0];

        // 1. JUDICIS SYNC TO ADDED AGENTS
        const finalJudici = currentNotes[firstTarget][finalTip]?.judici;
        if (finalJudici && finalJudici.agents) {
            for (const ag of finalJudici.agents) {
                const targetTip = String(typeof ag === 'object' ? ag.tip : ag);
                if (targetTip !== String(finalTip)) {
                    const targetData = currentNotes[firstTarget][targetTip] || { statuses: [], note: "" };
                    if (!!actingAsUser) targetData.modifiedByAdmin = true;
                    if (!targetData.statuses.includes("JUDICI")) {
                        targetData.statuses.push("JUDICI");
                    }
                    targetData.judici = finalJudici;
                    currentNotes[firstTarget][targetTip] = targetData;

                    // Solo enviar alerta si el TIP añadido NO es el del usuario actual
                    if (!actingAsUser && targetTip !== String(userTip)) {
                        const dateObj = selectedDayData.date;
                        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                        const senderMsg = `TIP ${userTip}`;
                        await addAlert(targetTip, `${senderMsg} t'ha assignat un JUDICI pel dia ${formattedDate}`, dateObj);
                    } else if (actingAsUser) {
                        // Si es admin, siempre enviar alerta
                        const dateObj = selectedDayData.date;
                        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                        const senderMsg = "L'administrador";
                        await addAlert(targetTip, `${senderMsg} t'ha assignat un JUDICI pel dia ${formattedDate}`, dateObj);
                    }
                }
            }
        }

        // 2. PERLLONGAMENTS SYNC TO ADDED AGENTS
        const finalPerl = currentNotes[firstTarget][finalTip]?.perllongament;
        if (finalPerl && finalPerl.agents) {
            for (const ag of finalPerl.agents) {
                const targetTip = String(typeof ag === 'object' ? ag.tip : ag);
                if (targetTip !== String(finalTip)) {
                    const targetData = currentNotes[firstTarget][targetTip] || { statuses: [], note: "" };
                    if (!!actingAsUser) targetData.modifiedByAdmin = true;
                    if (!targetData.statuses.includes("PERLLONGAMENT")) {
                        targetData.statuses.push("PERLLONGAMENT");
                    }
                    targetData.perllongament = finalPerl;
                    currentNotes[firstTarget][targetTip] = targetData;

                    // Solo enviar alerta si el TIP añadido NO es el del usuario actual
                    if (!actingAsUser && targetTip !== String(userTip)) {
                        const dateObj = selectedDayData.date;
                        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                        const senderMsg = `TIP ${userTip}`;
                        await addAlert(targetTip, `${senderMsg} t'ha assignat un PERLLONGAMENT pel dia ${formattedDate}`, dateObj);
                    } else if (actingAsUser) {
                        // Si es admin, siempre enviar alerta
                        const dateObj = selectedDayData.date;
                        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                        const senderMsg = "L'administrador";
                        await addAlert(targetTip, `${senderMsg} t'ha assignat un PERLLONGAMENT pel dia ${formattedDate}`, dateObj);
                    }
                }
            }
        }

        setCalendarNotes(currentNotes);
        await saveCalendarNotes(currentNotes);
        closeUserModal();
    };

    const confirmDeleteStatus = (statusToDelete) => {
        const finalTip = actingAsUser || userTip;
        Alert.alert(
            "Eliminar Permís",
            `Segur que vols eliminar el registre de ${statusToDelete}?`,
            [
                { text: "Cancel·lar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: async () => {
                        const dateStr = selectedDayData.date.toDateString();
                        const currentNotes = { ...calendarNotes };
                        const targetDayData = (currentNotes[dateStr] && finalTip) ? currentNotes[dateStr][finalTip] : null;

                        if (targetDayData) {
                            // SECURITY CHECK: Only the owner of the TIP or an Administrator can delete a status
                            if (!isAdmin && String(userTip) !== String(finalTip)) {
                                Alert.alert("Accés Denegat", "Només el propietari del registre o un administrador poden eliminar aquest permís.");
                                return;
                            }

                            if ((statusToDelete === "VACANCES" || statusToDelete === "BAIXA") && targetDayData.range) {
                                const { start, end } = targetDayData.range;
                                Object.keys(currentNotes).forEach(dStr => {
                                    const dayEntry = currentNotes[dStr];
                                    if (dayEntry[finalTip] && dayEntry[finalTip].range && dayEntry[finalTip].range.start === start && dayEntry[finalTip].range.end === end) {
                                        const entry = dayEntry[finalTip];
                                        entry.statuses = (entry.statuses || []).filter(s => s !== statusToDelete);
                                        if (entry.statuses.length === 0 && (!entry.note || !entry.note.trim())) {
                                            delete dayEntry[finalTip];
                                            if (Object.keys(dayEntry).length === 0) delete currentNotes[dStr];
                                        } else {
                                            delete entry.range;
                                        }
                                    }
                                });
                            } else {
                                let newStatuses = (targetDayData.statuses || []).filter(s => s !== statusToDelete);
                                if (newStatuses.length === 0 && (!targetDayData.note || !targetDayData.note.trim())) {
                                    delete currentNotes[dateStr][finalTip];
                                    if (Object.keys(currentNotes[dateStr]).length === 0) delete currentNotes[dateStr];
                                } else {
                                    currentNotes[dateStr][finalTip] = {
                                        ...targetDayData,
                                        statuses: newStatuses,
                                        modifiedByAdmin: !!actingAsUser || targetDayData.modifiedByAdmin,
                                        perllongament: statusToDelete === "PERLLONGAMENT" ? null : targetDayData.perllongament,
                                        judici: statusToDelete === "JUDICI" ? null : targetDayData.judici,
                                        fullDay: (statusToDelete === "PERMÍS" || statusToDelete === "AP" || statusToDelete === "ALTRES") ? false : targetDayData.fullDay,
                                        partial: (statusToDelete === "PERMÍS" || statusToDelete === "AP" || statusToDelete === "ALTRES") ? null : targetDayData.partial
                                    };
                                }
                            }
                            setCalendarNotes(currentNotes);
                            await saveCalendarNotes(currentNotes);
                            setIsStatusSelectorVisible(false);
                            setActingAsUser(null);
                            setActingAsNom(null);
                        }
                    }
                }
            ]
        );
    };

    const handleAdminAgentPress = (item) => {
        setActingAsUser(item.tip);
        setActingAsNom(item.nom);

        const statuses = item.statuses || (item.status ? [item.status] : []);
        if (statuses.length >= 1) {
            setExistingDayStatuses(statuses);
            setIsStatusSelectorVisible(true);
        } else {
            openUserDayDetails(selectedDayData.date, null, item.tip, item.nom);
        }
    };

    const closeUserModal = () => {
        setIsUserModalVisible(false);
        setActingAsUser(null);
        setActingAsNom(null);
    };

    const MonthView = ({ year, monthIndex }) => {
        const monthNames = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
        const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        // Días del mes anterior para rellenar el principio
        const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
        const prevMonthDays = [];
        for (let i = adjustedFirstDay - 1; i >= 0; i--) {
            prevMonthDays.push({ day: prevMonthLastDay - i, isCurrentMonth: false, monthOffset: -1 });
        }

        // Días del mes actual
        const currentMonthDays = [];
        for (let i = 1; i <= daysInMonth; i++) {
            currentMonthDays.push({ day: i, isCurrentMonth: true, monthOffset: 0 });
        }

        // Días del mes siguiente para completar la última fila (total 42 celdas para 6 filas fijas o lo necesario)
        const totalCellsSoFar = prevMonthDays.length + currentMonthDays.length;
        const nextMonthDays = [];
        const remainingCells = 7 - (totalCellsSoFar % 7);
        if (remainingCells < 7) {
            for (let i = 1; i <= remainingCells; i++) {
                nextMonthDays.push({ day: i, isCurrentMonth: false, monthOffset: 1 });
            }
        }

        const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

        return (
            <View style={styles.monthContainer}>
                <Text style={styles.monthTitle}>{monthNames[monthIndex]} {year}</Text>
                <View style={styles.calendarGrid}>
                    {["Dl", "Dm", "Dc", "Dj", "Dv", "Ds", "Dg"].map(d => (
                        <Text key={d} style={styles.dayHeader}>{d}</Text>
                    ))}
                    {allDays.map((item, index) => {
                        const date = new Date(year, monthIndex + item.monthOffset, item.day);
                        const dateStr = date.toDateString();
                        const turnKey = getTurnForDate(date);
                        const turn = turns[turnKey];
                        const dayNotes = calendarNotes[dateStr] || {};
                        const userStatuses = (dayNotes[userTip]?.statuses || (dayNotes[userTip]?.status ? [dayNotes[userTip].status] : [])).filter(Boolean);
                        const dayStatuses = Object.values(dayNotes)
                            .flatMap(n => n.statuses || (n.status ? [n.status] : []))
                            .filter(Boolean);
                        const uniqueStatuses = [...new Set(dayStatuses)];
                        const uniqueUserStatuses = [...new Set(userStatuses)];

                        return (
                            <TouchableOpacity
                                key={`${item.monthOffset}-${item.day}-${index}`}
                                onPress={() => item.isCurrentMonth && handleDayPress(date)}
                                disabled={!item.isCurrentMonth}
                                style={[
                                    styles.dayCell,
                                    { backgroundColor: turn ? turn.color : "white" },
                                    !item.isCurrentMonth && { opacity: 0.3, backgroundColor: '#E0E0E0' }
                                ]}
                            >
                                {/* Background collor for statuses */}
                                {(() => {
                                    const adminFilteredStatuses = uniqueStatuses.filter(st => st !== "VACANCES" && st !== "BAIXA");
                                    const hasPermisForColor = isAdmin ? adminFilteredStatuses.length > 0 : uniqueUserStatuses.length > 0;

                                    const textColor = item.isCurrentMonth ? (turnKey === "F" || hasPermisForColor ? "#000" : "#FFF") : "#999";

                                    return (
                                        <>
                                            {item.isCurrentMonth && (
                                                <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
                                                    {(() => {
                                                        if (isAdmin) {
                                                            return adminFilteredStatuses.length > 0 ? <View style={{ flex: 1, backgroundColor: '#FFF3E0' }} /> : null;
                                                        } else {
                                                            if (uniqueUserStatuses.length === 0) return null;
                                                            return uniqueUserStatuses.map((st, i) => (
                                                                <View
                                                                    key={i}
                                                                    style={{
                                                                        flex: 1,
                                                                        backgroundColor: STATUS_LIGHT_COLORS[st] || 'transparent'
                                                                    }}
                                                                />
                                                            ));
                                                        }
                                                    })()}
                                                </View>
                                            )}

                                            <Text style={[styles.dayNumber, { color: textColor }]}>{item.day}</Text>
                                            <Text style={[styles.turnLabel, { color: (uniqueStatuses.includes("ROMANENT")) ? "#0D47A1" : textColor, fontSize: 14 }]}>
                                                {(uniqueStatuses.includes("ROMANENT") && turnKey === "F") ? "R" : turnKey}
                                            </Text>

                                            {/* Indicador d'anotacions */}
                                            {(() => {
                                                const hasNotes = isAdmin ? !!calendarNotes[dateStr] : !!dayNotes[userTip];
                                                const showIndicator = isAdmin ? adminFilteredStatuses.length > 0 : (uniqueUserStatuses.length > 0 || (dayNotes[userTip]?.note && dayNotes[userTip].note.trim()));

                                                if (!item.isCurrentMonth || !showIndicator) return null;

                                                return (
                                                    <View style={[styles.noteIndicator, hasPermisForColor && { backgroundColor: '#555' }]} />
                                                );
                                            })()}
                                        </>
                                    );
                                })()}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    // Generar lista de meses del año policial (Feb -> Jan del año siguiente)
    const months = [];
    for (let i = 1; i <= 12; i++) {
        const m = (1 + i - 1);
        const monthIdx = m % 12;
        const yearIdx = m >= 12 ? policeYear + 1 : policeYear;
        months.push({ year: yearIdx, month: monthIdx });
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.yearSelector}>
                    <TouchableOpacity onPress={() => setPoliceYear(policeYear - 1)}>
                        <Text style={styles.yearNav}>◀</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>ANY {policeYear}</Text>
                    <TouchableOpacity onPress={() => setPoliceYear(policeYear + 1)}>
                        <Text style={styles.yearNav}>▶</Text>
                    </TouchableOpacity>
                </View>


                {/* Selector de Grups */}
                <View style={styles.grupSelector}>
                    {[1, 2, 3, 4, 5].map(g => (
                        <TouchableOpacity
                            key={g}
                            onPress={() => updateSelectedGrup(g)}
                            style={[styles.grupBtn, selectedGrup === g && styles.grupBtnActive]}
                        >
                            <Text style={[styles.grupBtnText, selectedGrup === g && styles.grupBtnTextActive]}>ESC{g}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* REMOVED USER LIST */}
                {false && (
                    <View>
                        {(() => {
                            // Obtener todos los meses que tienen notas del usuario
                            const userNotesByMonth = {};
                            const monthNames = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];

                            Object.keys(calendarNotes).forEach(dateStr => {
                                const dayData = calendarNotes[dateStr];
                                if (dayData && dayData[userTip]) {
                                    const dateObj = new Date(dateStr);
                                    const monthKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
                                    if (!userNotesByMonth[monthKey]) userNotesByMonth[monthKey] = [];
                                    userNotesByMonth[monthKey].push({ date: dateObj, data: dayData[userTip] });
                                }
                            });

                            // Ordenar meses y días
                            const sortedMonths = Object.keys(userNotesByMonth).sort((a, b) => {
                                const [yearA, monthA] = a.split('-').map(Number);
                                const [yearB, monthB] = b.split('-').map(Number);
                                return yearA !== yearB ? yearA - yearB : monthA - monthB;
                            });

                            if (sortedMonths.length === 0) {
                                return (
                                    <View style={styles.emptyListContainer}>
                                        <Text style={styles.emptyListText}>No tens cap anotació registrada.</Text>
                                        <Text style={styles.emptyListSubtext}>Toca qualsevol dia al calendari per afegir-ne una.</Text>
                                    </View>
                                );
                            }

                            return sortedMonths.map(monthKey => {
                                const [year, monthIdx] = monthKey.split('-').map(Number);
                                const days = userNotesByMonth[monthKey].sort((a, b) => a.date - b.date);

                                return (
                                    <View key={monthKey} style={styles.monthListSection}>
                                        <Text style={styles.monthListTitle}>{monthNames[monthIdx]}</Text>
                                        {days.map((item, idx) => {
                                            const statuses = item.data.statuses || (item.data.status ? [item.data.status] : []);
                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={styles.dayListItem}
                                                    onPress={() => handleDayPress(item.date)}
                                                >
                                                    <View style={styles.dayListHeader}>
                                                        <Text style={styles.dayListDate}>
                                                            {item.date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </Text>
                                                        <View style={styles.dayListStatusRow}>
                                                            {statuses.map((st, i) => (
                                                                <View
                                                                    key={i}
                                                                    style={[styles.miniStatusBadge, { backgroundColor: STATUS_LIGHT_COLORS[st] }]}
                                                                >
                                                                    <Text style={styles.miniStatusText}>{st}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    </View>

                                                    {item.data.note ? (
                                                        <Text style={styles.dayListNote}>{item.data.note}</Text>
                                                    ) : null}

                                                    {item.data.perllongament && (
                                                        <Text style={styles.dayListSubInfo}>• Perllongament fins les {item.data.perllongament.horaFi}</Text>
                                                    )}
                                                    {item.data.judici && (
                                                        <Text style={styles.dayListSubInfo}>• Judici a les {item.data.judici.hora} ({item.data.judici.jutjat} {item.data.judici.numJutjat})</Text>
                                                    )}
                                                    {item.data.partial && !item.data.fullDay && (
                                                        <Text style={styles.dayListSubInfo}>• Parcial: {item.data.partial.start} - {item.data.partial.end}</Text>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                );
                            });
                        })()}

                    </View>
                )}

                {months.map((m, idx) => (
                    <MonthView key={idx} year={m.year} monthIndex={m.month} />
                ))}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Modal de Detalls del Dia per a Administradors */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Detalls del Dia</Text>
                            <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>TANCAR</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>{selectedDayData?.dateLabel}</Text>

                        {loadingDetails ? (
                            <ActivityIndicator size="large" color={COLORS.PRIMARY} style={{ marginVertical: 30 }} />
                        ) : (
                            <ScrollView style={{ marginTop: 15 }}>
                                {selectedDayData?.details?.length > 0 ? (
                                    <>
                                        {/* SECCIÓ PERMISOS - El que l'usuari vol veure primer */}
                                        {selectedDayData.details.filter(i => i.status && i.status !== "-").length > 0 && (
                                            <View style={{ marginBottom: 20 }}>
                                                <Text style={styles.sectionLabelAdmin}>AGENTS AMB PERMÍS / ABSÈNCIA</Text>
                                                {selectedDayData.details.filter(i => i.status && i.status !== "-").map((item, idx) => (
                                                    <TouchableOpacity
                                                        key={`perm-${idx}`}
                                                        onPress={() => handleAdminAgentPress(item)}
                                                        style={[styles.detailCard, { borderLeftWidth: 4, borderLeftColor: STATUS_COLORS[item.status]?.bg || COLORS.PRIMARY }]}
                                                    >
                                                        <View style={{ marginBottom: 5 }}>
                                                            {/* Fila Superior: TIP, Nom/Cat i Historial */}
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <View style={[styles.adminTipCircle, { backgroundColor: COLORS.PRIMARY, width: 40, height: 40, borderRadius: 20 }]}>
                                                                    <Text style={[styles.adminTipText, { color: 'white', fontSize: 12 }]}>{item.tip}</Text>
                                                                </View>
                                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                                    <Text numberOfLines={1} style={[styles.detailName, { fontSize: 16, fontWeight: '900', color: COLORS.PRIMARY }]}>
                                                                        {item.nom}
                                                                    </Text>
                                                                    <Text style={[styles.detailCat, { fontSize: 12, marginTop: -2 }]}>{item.categoria}</Text>
                                                                </View>
                                                            </View>

                                                            {/* Fila Inferior: Estats (sota el TIP, creixent a la dreta) */}
                                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                                                                {(item.statuses || (item.status ? [item.status] : [])).map((st, i) => {
                                                                    let displayText = st;
                                                                    const lowerSt = st.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // "permís" -> "permis"

                                                                    // Check for PERMÍS, AP, ALTRES
                                                                    // Check for PERMÍS, AP, ALTRES
                                                                    if (st === "PERMÍS" || st === "AP" || st === "ALTRES") {
                                                                        const stKey = st.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                                        const specificData = item[stKey];

                                                                        if (specificData) {
                                                                            if (!specificData.fullDay && specificData.partial) {
                                                                                displayText = `${st} ${specificData.partial.start} - ${specificData.partial.end}`;
                                                                            }
                                                                        } else if (item.partial && !item.fullDay && item.partial.start) {
                                                                            // Fallback para datos antiguos o globales
                                                                            displayText = `${st} ${item.partial.start} - ${item.partial.end}`;
                                                                        }
                                                                    }

                                                                    // Check for JUDICI
                                                                    if (st === "JUDICI" && item.judici && item.judici.hora) {
                                                                        const diaStr = item.judici.dia ? ` ${item.judici.dia}` : "";
                                                                        displayText = `${st} ${item.judici.hora}${diaStr}`;
                                                                    }

                                                                    return (
                                                                        <View
                                                                            key={i}
                                                                            style={[
                                                                                styles.miniStatusBadgeSupport,
                                                                                {
                                                                                    backgroundColor: STATUS_LIGHT_COLORS[st] || 'rgba(0,0,0,0.05)',
                                                                                    paddingVertical: 2,
                                                                                    minWidth: 70,
                                                                                    marginRight: 6,
                                                                                    marginBottom: 4
                                                                                }
                                                                            ]}
                                                                        >
                                                                            <Text style={[styles.miniStatusTextSupport, { fontSize: 9 }]}>{displayText}</Text>
                                                                        </View>
                                                                    );
                                                                })}
                                                            </View>

                                                        </View>


                                                        {
                                                            item.note ? (
                                                                <View style={styles.adminNoteBox}>
                                                                    <Text style={styles.adminNoteText}>"{item.note}"</Text>
                                                                </View>
                                                            ) : null
                                                        }

                                                        {item.modifiedByAdmin && (
                                                            <View style={{ marginTop: 4, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 6 }}>
                                                                <Text style={{ fontSize: 9, color: '#D32F2F', fontWeight: 'bold' }}>
                                                                    Modificat per l'administrador
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </>
                                ) : (
                                    <View style={{ padding: 40, alignItems: 'center' }}>
                                        <Text style={{ fontSize: 40, marginBottom: 20 }}>📅</Text>
                                        <Text style={styles.emptyText}>No hi ha activitat registrada per a aquest dia.</Text>
                                    </View>
                                )}
                            </ScrollView>
                        )}
                    </View>
                </View >
            </Modal >

            {/* Selector de Permís si n'hi ha múltiples */}
            < Modal
                visible={isStatusSelectorVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsStatusSelectorVisible(false)
                }
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.selectorModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.selectorTitle}>
                                {actingAsNom ? `GESTIONAR: ${actingAsNom.split(' ')[0]}` : "GESTIONAR PERMISOS"}
                            </Text>
                            <TouchableOpacity onPress={() => setIsStatusSelectorVisible(false)} style={styles.closeBtnSmall}>
                                <Text style={styles.closeBtnText}>X</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.selectorSubtitle}>{selectedDayData?.dateLabel}</Text>

                        <View style={{ marginTop: 20 }}>
                            {existingDayStatuses.map(status => (
                                <View
                                    key={status}
                                    style={[
                                        styles.selectorRow,
                                        {
                                            backgroundColor: STATUS_COLORS[status]?.bg || '#DDD',
                                            borderColor: STATUS_COLORS[status]?.bg || '#DDD'
                                        }
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={styles.selectorMainAction}
                                        onPress={() => {
                                            setIsStatusSelectorVisible(false);
                                            openUserDayDetails(selectedDayData.date, status);
                                        }}
                                    >
                                        <Text style={[styles.selectorBtnText, { color: STATUS_COLORS[status]?.text || '#333' }]}>
                                            {status}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.deleteTab}
                                        onPress={() => confirmDeleteStatus(status)}
                                    >
                                        <Text style={[styles.deleteTabText, { color: STATUS_COLORS[status]?.text || '#333' }]}>ESBORRAR</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}

                            <TouchableOpacity
                                style={[styles.selectorBtn, styles.addPermissionBtn]}
                                onPress={() => {
                                    setIsStatusSelectorVisible(false);
                                    openUserDayDetails(selectedDayData.date, null);
                                }}
                            >
                                <Text style={styles.addPermissionText}>+ AFEGIR NOU PERMÍS</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal >

            {/* Modal de l'Usuari per afegir anotacions */}
            < Modal
                visible={isUserModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsUserModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {selectedStatuses.length > 0 ? selectedStatuses[0] : "ANOTACIÓ"}
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                <TouchableOpacity onPress={closeUserModal} style={[styles.closeBtn, { marginRight: 8 }]}>
                                    <Text style={styles.closeBtnText}>CANCEL·LAR</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleSaveUserNote} style={[styles.closeBtn, { backgroundColor: COLORS.PRIMARY }]}>
                                    <Text style={[styles.closeBtnText, { color: 'white' }]}>GUARDAR</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                            <Text style={[styles.modalSubtitle, { marginBottom: 0, marginTop: 5 }]}>{selectedDayData?.dateLabel}</Text>
                            {actingAsUser && (
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.PRIMARY }}>TIP {actingAsUser}</Text>
                                    {actingAsNom && (
                                        <Text style={{ fontSize: 10, color: '#888', fontWeight: '600', marginTop: 1 }}>{actingAsNom}</Text>
                                    )}
                                </View>
                            )}
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={{ width: '100%' }}
                        >
                            <View style={styles.statusOptionsContainer}>
                                {STATUS_ROW1.map(opt => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[
                                            styles.statusChip,
                                            selectedStatuses.includes(opt) && {
                                                backgroundColor: STATUS_COLORS[opt].bg,
                                                borderColor: STATUS_COLORS[opt].bg
                                            }
                                        ]}
                                        onPress={() => {
                                            if (selectedStatuses.includes(opt)) {
                                                setSelectedStatuses([]);
                                            } else {
                                                setSelectedStatuses([opt]);
                                                if (opt === "PERMÍS" || opt === "AP" || opt === "ALTRES") setIsFullDay(true);
                                            }
                                        }}
                                    >
                                        <Text style={[
                                            styles.statusChipText,
                                            selectedStatuses.includes(opt) && { color: STATUS_COLORS[opt].text }
                                        ]}>
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={styles.statusOptionsContainer}>
                                {STATUS_ROW2.map(opt => {
                                    // Només mostrar ROMANENT si és dia de festa (F)
                                    if (opt === "ROMANENT" && (!selectedDayData?.date || getTurnForDate(selectedDayData.date) !== 'F')) return null;

                                    return (
                                        <TouchableOpacity
                                            key={opt}
                                            style={[
                                                styles.statusChip,
                                                selectedStatuses.includes(opt) && {
                                                    backgroundColor: STATUS_COLORS[opt].bg,
                                                    borderColor: STATUS_COLORS[opt].bg
                                                }
                                            ]}
                                            onPress={() => {
                                                if (selectedStatuses.includes(opt)) {
                                                    setSelectedStatuses([]);
                                                } else {
                                                    setSelectedStatuses([opt]);
                                                    if (opt === "PERMÍS" || opt === "AP" || opt === "ALTRES") setIsFullDay(true);
                                                }
                                            }}
                                        >
                                            <Text style={[
                                                styles.statusChipText,
                                                selectedStatuses.includes(opt) && { color: STATUS_COLORS[opt].text }
                                            ]}>
                                                {opt}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {(selectedStatuses.includes("VACANCES") || selectedStatuses.includes("BAIXA")) && (
                                <View style={styles.genericForm}>
                                    <View style={[styles.formRow, { justifyContent: 'space-between' }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <Text style={styles.formLabelInline}>DE:</Text>
                                            <TextInput
                                                style={[styles.formInputCompact, { flex: 1, marginBottom: 0 }]}
                                                value={rangeData.start}
                                                onChangeText={(v) => setRangeData(p => ({ ...p, start: formatDateInput(v) }))}
                                                placeholder="DD/MM/YYYY"
                                                keyboardType="numeric"
                                                maxLength={10}
                                            />
                                        </View>
                                        <View style={{ width: 15 }} />
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={styles.formLabelInline}>FINS:</Text>
                                                <TextInput
                                                    style={[styles.formInputCompact, { flex: 1, marginBottom: 0 }, isUnknownEnd && { backgroundColor: '#F0F0F0', color: '#999' }]}
                                                    value={rangeData.end}
                                                    onChangeText={(v) => {
                                                        setRangeData(p => ({ ...p, end: formatDateInput(v) }));
                                                        if (isUnknownEnd) setIsUnknownEnd(false);
                                                    }}
                                                    onFocus={() => {
                                                        if (isUnknownEnd) setIsUnknownEnd(false);
                                                    }}
                                                    placeholder="DD/MM/YYYY"
                                                    keyboardType="numeric"
                                                    maxLength={10}
                                                />
                                            </View>

                                            {selectedStatuses.includes("BAIXA") && (
                                                <TouchableOpacity
                                                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, paddingLeft: 35 }}
                                                    onPress={() => setIsUnknownEnd(!isUnknownEnd)}
                                                >
                                                    <View style={[styles.checkbox, isUnknownEnd && styles.checkboxChecked, { width: 14, height: 14, borderRadius: 3 }]}>
                                                        {isUnknownEnd && <Text style={{ color: 'white', fontSize: 8 }}>✓</Text>}
                                                    </View>
                                                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#555', marginLeft: 5 }}>ES DESCONEIX ALTA</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    <View style={{ marginTop: 10, padding: 8, backgroundColor: '#E3F2FD', borderRadius: 8 }}>
                                        <Text style={{ fontSize: 10, color: '#1565C0', fontStyle: 'italic', textAlign: 'center' }}>
                                            S'afegirà un registre per cada dia del rang automàticament.
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {selectedStatuses.includes("PERLLONGAMENT") && (
                                <View style={styles.perllongamentForm}>
                                    <Text style={styles.formTitle}>DADES PERLLONGAMENT:</Text>
                                    <Text style={styles.formLabel}>DILIGÈNCIES:</Text>
                                    <TextInput
                                        style={styles.formInputCompact}
                                        placeholder="Ex: 1234/2026"
                                        value={perllongamentData.diligencies}
                                        onChangeText={(v) => setPerllongamentData(p => ({ ...p, diligencies: v }))}
                                    />
                                    <Text style={styles.formLabel}>MOTIU:</Text>
                                    <TextInput
                                        style={styles.formInputCompact}
                                        placeholder="Detalli el motiu..."
                                        value={perllongamentData.motiu}
                                        onChangeText={(v) => setPerllongamentData(p => ({ ...p, motiu: v }))}
                                    />



                                    {(() => {
                                        const date = selectedDayData?.date;
                                        const turn = date ? getTurnForDate(date) : null;
                                        const { start: refStart, end: refEnd } = date ? getShiftHours(date, turn) : { start: '?', end: '?' };
                                        return (
                                            <>
                                                {/* SECCIÓ A: INICI (ANTICIPACIÓ) */}
                                                <View style={{ backgroundColor: '#F0F4C3', padding: 8, borderRadius: 8, marginBottom: 10 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#33691E', marginBottom: 5 }}>AGENTS I HORA D'INICI (ANTICIPAMENT):</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <TextInput
                                                            style={[styles.formInputCompact, { width: 60, marginBottom: 0, marginRight: 6 }]}
                                                            placeholder="TIP"
                                                            value={perllTipInici}
                                                            onChangeText={setPerllTipInici}
                                                            keyboardType="numeric"
                                                        />
                                                        <TextInput
                                                            style={[styles.formInputCompact, { width: 60, marginBottom: 0, marginRight: 6 }]}
                                                            placeholder="Hora"
                                                            value={perllHoraInici}
                                                            onChangeText={(v) => setPerllHoraInici(formatTimeInput(v))}
                                                            keyboardType="numeric"
                                                            maxLength={5}
                                                        />
                                                        <TextInput
                                                            style={[styles.formInputCompact, { width: 95, marginBottom: 0, marginRight: 6 }]}
                                                            placeholder="Data"
                                                            value={perllDataInici}
                                                            onChangeText={(v) => setPerllDataInici(formatDateInput(v))}
                                                            keyboardType="numeric"
                                                            maxLength={10}
                                                        />
                                                        <TouchableOpacity
                                                            style={[styles.plusBtn, { backgroundColor: '#558B2F' }]}
                                                            onPress={() => {
                                                                if (!perllongamentData.motiu?.trim()) {
                                                                    Alert.alert("Atenció", "El MOTIU és obligatori.");
                                                                    return;
                                                                }
                                                                if (perllTipInici.trim()) {
                                                                    const date = selectedDayData?.date;
                                                                    if (date) {
                                                                        const turn = getTurnForDate(date);
                                                                        const { start: shiftStart } = getShiftHours(date, turn);
                                                                        const serviceDayStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;

                                                                        if (perllDataInici === serviceDayStr) {
                                                                            const [hA, mA] = perllHoraInici.split(':').map(Number);
                                                                            const [hS, mS] = shiftStart.split(':').map(Number);
                                                                            const valA = (hA || 0) * 60 + (mA || 0);
                                                                            const valS = (hS || 0) * 60 + (mS || 0);

                                                                            if (valA >= valS) {
                                                                                Alert.alert("Atenció", `L'hora d'anticipació ha de ser anterior a l'inici del servei (${shiftStart})`);
                                                                                return;
                                                                            }
                                                                        }

                                                                        setPerllongamentData(p => ({
                                                                            ...p,
                                                                            agents: [...(p.agents || []), {
                                                                                tip: perllTipInici.trim(),
                                                                                hora: `${perllHoraInici} - ${shiftStart}`,
                                                                                data1: perllDataInici,
                                                                                data2: serviceDayStr,
                                                                                motiu: p.motiu,
                                                                                diligencies: p.diligencies,
                                                                                tipus: 'INICI'
                                                                            }]
                                                                        }));
                                                                        // Send immediate alert for anticipation solo si el TIP no es el del usuario
                                                                        if (!actingAsUser && perllTipInici.trim() !== String(userTip)) {
                                                                            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                                                                            const senderMsg = `TIP ${userTip}`;
                                                                            addAlert(perllTipInici.trim(), `${senderMsg} t'ha assignat un ANTICIPAMENT pel dia ${formattedDate}`, date);
                                                                        } else if (actingAsUser) {
                                                                            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                                                                            const senderMsg = "L'administrador";
                                                                            addAlert(perllTipInici.trim(), `${senderMsg} t'ha assignat un ANTICIPAMENT pel dia ${formattedDate}`, date);
                                                                        }
                                                                        setPerllTipInici("");
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Text style={styles.plusBtnText}>+</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>

                                                {/* SECCIÓ B: FI (PERLLONGAMENT) */}
                                                <View style={{ backgroundColor: '#E1F5FE', padding: 8, borderRadius: 8, marginBottom: 10 }}>
                                                    <Text style={{ fontSize: 11, fontWeight: '900', color: '#01579B', marginBottom: 5 }}>AGENTS I HORA DE FI (PERLLONGAMENT):</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <TextInput
                                                            style={[styles.formInputCompact, { width: 60, marginBottom: 0, marginRight: 6 }]}
                                                            placeholder="TIP"
                                                            value={perllTipFi}
                                                            onChangeText={setPerllTipFi}
                                                            keyboardType="numeric"
                                                        />
                                                        <TextInput
                                                            style={[styles.formInputCompact, { width: 60, marginBottom: 0, marginRight: 6 }]}
                                                            placeholder="Hora"
                                                            value={perllHoraFi}
                                                            onChangeText={(v) => setPerllHoraFi(formatTimeInput(v))}
                                                            keyboardType="numeric"
                                                            maxLength={5}
                                                        />
                                                        <TextInput
                                                            style={[styles.formInputCompact, { width: 95, marginBottom: 0, marginRight: 6 }]}
                                                            placeholder="Data"
                                                            value={perllDataFi}
                                                            onChangeText={(v) => setPerllDataFi(formatDateInput(v))}
                                                            keyboardType="numeric"
                                                            maxLength={10}
                                                        />
                                                        <TouchableOpacity
                                                            style={[styles.plusBtn, { backgroundColor: '#0288D1' }]}
                                                            onPress={() => {
                                                                if (!perllongamentData.motiu?.trim()) {
                                                                    Alert.alert("Atenció", "El MOTIU és obligatori.");
                                                                    return;
                                                                }
                                                                if (perllTipFi.trim()) {
                                                                    const date = selectedDayData?.date;
                                                                    if (date) {
                                                                        const turn = getTurnForDate(date);
                                                                        const { end: shiftEnd } = getShiftHours(date, turn);

                                                                        let serviceEndDay = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                                                                        const hh = parseInt(shiftEnd.split(':')[0]);
                                                                        if (hh >= 18 || hh < 8) {
                                                                            const nextDay = new Date(date);
                                                                            nextDay.setDate(date.getDate() + 1);
                                                                            serviceEndDay = `${nextDay.getDate().toString().padStart(2, '0')}/${(nextDay.getMonth() + 1).toString().padStart(2, '0')}/${nextDay.getFullYear()}`;
                                                                        }

                                                                        const isSameDay = perllDataFi === serviceEndDay;
                                                                        if (isSameDay) {
                                                                            const [hP, mP] = perllHoraFi.split(':').map(Number);
                                                                            const [hS, mS] = shiftEnd.split(':').map(Number);
                                                                            const valP = (hP || 0) * 60 + (mP || 0);
                                                                            const valS = (hS || 0) * 60 + (mS || 0);

                                                                            if (valP <= valS) {
                                                                                Alert.alert("Atenció", `L'hora de perllongament ha de ser posterior al final del servei (${shiftEnd})`);
                                                                                return;
                                                                            }
                                                                        } else {
                                                                            const [dP, mP, yP] = perllDataFi.split('/').map(Number);
                                                                            const [dS, mS, yS] = serviceEndDay.split('/').map(Number);
                                                                            const dateP = new Date(yP, mP - 1, dP);
                                                                            const dateS = new Date(yS, mS - 1, dS);

                                                                            if (dateP < dateS) {
                                                                                Alert.alert("Atenció", `La data de perllongament no pot ser anterior a la data de fi de servei (${serviceEndDay})`);
                                                                                return;
                                                                            }
                                                                        }

                                                                        setPerllongamentData(p => ({
                                                                            ...p,
                                                                            agents: [...(p.agents || []), {
                                                                                tip: perllTipFi.trim(),
                                                                                hora: `${shiftEnd} - ${perllHoraFi}`,
                                                                                data1: serviceEndDay,
                                                                                data2: perllDataFi,
                                                                                motiu: p.motiu,
                                                                                diligencies: p.diligencies,
                                                                                tipus: 'FI'
                                                                            }]
                                                                        }));
                                                                        // Send immediate alert for perllongament solo si el TIP no es el del usuario
                                                                        if (!actingAsUser && perllTipFi.trim() !== String(userTip)) {
                                                                            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                                                                            const senderMsg = `TIP ${userTip}`;
                                                                            addAlert(perllTipFi.trim(), `${senderMsg} t'ha assignat un PERLLONGAMENT pel dia ${formattedDate}`, date);
                                                                        } else if (actingAsUser) {
                                                                            const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                                                                            const senderMsg = "L'administrador";
                                                                            addAlert(perllTipFi.trim(), `${senderMsg} t'ha assignat un PERLLONGAMENT pel dia ${formattedDate}`, date);
                                                                        }
                                                                        setPerllTipFi("");
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <Text style={styles.plusBtnText}>+</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </>
                                        );
                                    })()}

                                    {perllongamentData.agents?.length > 0 && (
                                        <View style={styles.agentsTagList}>
                                            {[...(perllongamentData.agents)].sort((a, b) => (a.tipus === 'INICI' ? -1 : 1)).map((ag, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={[styles.agentTag, { backgroundColor: ag.tipus === 'INICI' ? '#F1F8E9' : '#E3F2FD', borderColor: ag.tipus === 'INICI' ? '#558B2F' : '#0288D1', borderWidth: 1 }]}
                                                    onPress={() => {
                                                        const agTip = (typeof ag === 'object' && ag !== null) ? String(ag.tip) : String(ag);
                                                        if (!isAdmin && String(userTip) !== String(agTip)) {
                                                            Alert.alert("Accés Denegat", "Només el propietari del registre o un administrador poden eliminar-se d'aquest permís.");
                                                            return;
                                                        }
                                                        setPerllongamentData(p => ({
                                                            ...p,
                                                            agents: p.agents.filter((_, i) => i !== idx)
                                                        }));
                                                    }}
                                                >
                                                    <Text style={[styles.agentTagText, { color: ag.tipus === 'INICI' ? '#33691E' : '#01579B' }]}>
                                                        {ag.tipus === 'INICI' ? '▲ ' : '▼ '}
                                                        {(() => {
                                                            if (typeof ag !== 'object' || !ag.hora || !ag.hora.includes(' - ')) {
                                                                return `${ag.tip || ag} ${ag.hora || ''} ${ag.data || ''}`;
                                                            }
                                                            const [h1, h2] = ag.hora.split(' - ');
                                                            if (!h1 || !h2 || !h1.includes(':') || !h2.includes(':')) {
                                                                return `${ag.tip}, ${ag.hora}, ${ag.data}`;
                                                            }
                                                            try {
                                                                const [m1h, m1m] = h1.split(':').map(Number);
                                                                const [m2h, m2m] = h2.split(':').map(Number);
                                                                let diff = (m2h * 60 + m2m) - (m1h * 60 + m1m);
                                                                if (diff < 0) diff += 1440;

                                                                const d1 = ag.data1 || ag.data || '';
                                                                const d2 = ag.data2 || ag.data || '';

                                                                return `${ag.tip} ${h1} ${d1}, ${h2} ${d2}, (${diff}')`;
                                                            } catch (e) {
                                                                return `${ag.tip}, ${ag.hora}, ${ag.data || ''}`;
                                                            }
                                                        })()} ✕
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}

                            {selectedStatuses.includes("JUDICI") && (
                                <View style={styles.judiciForm}>
                                    <Text style={styles.formTitle}>DADES JUDICI:</Text>
                                    <View style={styles.formRow}>
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <Text style={styles.formLabel}>DIA:</Text>
                                            <View style={[styles.formInputCompact, styles.readonlyInput]}>
                                                <Text style={{ fontSize: 13 }}>{selectedDayData?.date ? `${selectedDayData.date.getDate().toString().padStart(2, '0')}/${(selectedDayData.date.getMonth() + 1).toString().padStart(2, '0')}/${selectedDayData.date.getFullYear()}` : ""}</Text>
                                            </View>
                                        </View>
                                        <View style={{ width: 80 }}>
                                            <Text style={styles.formLabel}>HORA:</Text>
                                            <TextInput
                                                style={styles.formInputCompact}
                                                value={judiciData.hora}
                                                onChangeText={(v) => setJudiciData(p => ({ ...p, hora: formatTimeInput(v) }))}
                                                placeholder="09:00"
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.formRow}>
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <Text style={styles.formLabel}>JUTJAT:</Text>
                                            <View style={styles.pickerContainer}>
                                                <Text style={styles.pickerValueText}>{judiciData.jutjat}</Text>
                                                <Picker
                                                    selectedValue={judiciData.jutjat}
                                                    onValueChange={(v) => setJudiciData(p => ({ ...p, jutjat: v }))}
                                                    style={styles.invisiblePicker}
                                                    dropdownIconColor="transparent"
                                                >
                                                    <Picker.Item label="Instrucció" value="Instrucció" />
                                                    <Picker.Item label="Penal" value="Penal" />
                                                    <Picker.Item label="Altres" value="Altres" />
                                                </Picker>
                                            </View>
                                        </View>
                                        <View style={{ width: 80 }}>
                                            <Text style={styles.formLabel}>Nº:</Text>
                                            <TextInput
                                                style={styles.formInputCompact}
                                                value={judiciData.numJutjat}
                                                onChangeText={(v) => setJudiciData(p => ({ ...p, numJutjat: v }))}
                                                placeholder="Ex: 1"
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.formRow}>
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <Text style={styles.formLabel}>DILIGÈNCIES:</Text>
                                            <TextInput
                                                style={styles.formInputCompact}
                                                value={judiciData.diligencies}
                                                onChangeText={(v) => setJudiciData(p => ({ ...p, diligencies: v }))}
                                                placeholder="Ex: 1234/26"
                                            />
                                        </View>
                                        <View style={{ width: 80 }}>
                                            <Text style={styles.formLabel}>SALA:</Text>
                                            <TextInput
                                                style={styles.formInputCompact}
                                                value={judiciData.sala}
                                                onChangeText={(v) => setJudiciData(p => ({ ...p, sala: v.slice(0, 3) }))}
                                                placeholder="Ex: 101"
                                                keyboardType="numeric"
                                                maxLength={3}
                                            />
                                        </View>
                                    </View>

                                    <View style={styles.perllAgentsHeader}>
                                        <Text style={styles.formLabel}>AGENTS:</Text>
                                    </View>

                                    <View style={styles.addAgentRow}>
                                        <TextInput
                                            style={[styles.formInputCompact, { flex: 1, marginBottom: 0, marginRight: 8 }]}
                                            placeholder="TIP"
                                            value={newAgentTip}
                                            onChangeText={setNewAgentTip}
                                            keyboardType="numeric"
                                        />
                                        <TouchableOpacity
                                            style={styles.plusBtn}
                                            onPress={async () => {
                                                if (newAgentTip.trim()) {
                                                    const targetTip = newAgentTip.trim();
                                                    setJudiciData(p => ({
                                                        ...p,
                                                        agents: [...p.agents, targetTip]
                                                    }));
                                                    // Send alert for Judici solo si el TIP no es el del usuario
                                                    if (!actingAsUser && targetTip !== String(userTip)) {
                                                        const dateObj = selectedDayData.date;
                                                        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                                                        const senderMsg = `TIP ${userTip}`;
                                                        addAlert(targetTip, `${senderMsg} t'ha assignat un JUDICI pel dia ${formattedDate}`, dateObj);
                                                    } else if (actingAsUser) {
                                                        const dateObj = selectedDayData.date;
                                                        const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
                                                        const senderMsg = "L'administrador";
                                                        addAlert(targetTip, `${senderMsg} t'ha assignat un JUDICI pel dia ${formattedDate}`, dateObj);
                                                    }
                                                    setNewAgentTip("");
                                                }
                                            }}
                                        >
                                            <Text style={styles.plusBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {judiciData.agents?.length > 0 && (
                                        <View style={styles.agentsTagList}>
                                            {judiciData.agents.map((ag, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={styles.agentTag}
                                                    onPress={() => {
                                                        const agTip = (typeof ag === 'object' && ag !== null) ? String(ag.tip) : String(ag);
                                                        if (!isAdmin && String(userTip) !== String(agTip)) {
                                                            Alert.alert("Accés Denegat", "Només el propietari del registre o un administrador poden eliminar-se d'aquest judici.");
                                                            return;
                                                        }
                                                        setJudiciData(p => ({
                                                            ...p,
                                                            agents: p.agents.filter((_, i) => i !== idx)
                                                        }));
                                                    }}
                                                >
                                                    <Text style={styles.agentTagText}>
                                                        {typeof ag === 'object' ? ag.tip : ag} ✕
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            )}



                            {(selectedStatuses.includes("PERMÍS") || selectedStatuses.includes("AP") || selectedStatuses.includes("ALTRES")) && (
                                <View style={styles.genericForm}>
                                    <Text style={styles.formTitle}>CONFIGURACIÓ PERMÍS:</Text>
                                    <View style={{
                                        flexDirection: 'row',
                                        backgroundColor: '#F1F3F5',
                                        borderRadius: 12,
                                        padding: 4,
                                        marginBottom: 15
                                    }}>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                alignItems: 'center',
                                                borderRadius: 10,
                                                backgroundColor: isFullDay ? 'white' : 'transparent',
                                                shadowColor: isFullDay ? "#000" : "transparent",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: isFullDay ? 0.1 : 0,
                                                shadowRadius: 4,
                                                elevation: isFullDay ? 2 : 0
                                            }}
                                            onPress={() => setIsFullDay(true)}
                                        >
                                            <Text style={{
                                                fontSize: 13,
                                                fontWeight: isFullDay ? '900' : '600',
                                                color: isFullDay ? COLORS.PRIMARY : '#666'
                                            }}>TORN SENCER</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                paddingVertical: 10,
                                                alignItems: 'center',
                                                borderRadius: 10,
                                                backgroundColor: !isFullDay ? 'white' : 'transparent',
                                                shadowColor: !isFullDay ? "#000" : "transparent",
                                                shadowOffset: { width: 0, height: 2 },
                                                shadowOpacity: !isFullDay ? 0.1 : 0,
                                                shadowRadius: 4,
                                                elevation: !isFullDay ? 2 : 0
                                            }}
                                            onPress={() => setIsFullDay(false)}
                                        >
                                            <Text style={{
                                                fontSize: 13,
                                                fontWeight: !isFullDay ? '900' : '600',
                                                color: !isFullDay ? COLORS.PRIMARY : '#666'
                                            }}>TORN PARCIAL</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {!isFullDay && (
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            backgroundColor: 'white',
                                            padding: 12,
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: '#E1E4E8'
                                        }}>
                                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#555' }}>HORES PARCIALS:</Text>
                                            <View style={styles.partialInputs}>
                                                <TextInput
                                                    style={styles.timeInputSmall}
                                                    value={partialData.start}
                                                    onChangeText={(v) => setPartialData(p => ({ ...p, start: formatTimeInput(v) }))}
                                                    placeholder="Inici"
                                                    keyboardType="numeric"
                                                    maxLength={5}
                                                />
                                                <Text style={styles.timeSeparator}>-</Text>
                                                <TextInput
                                                    style={styles.timeInputSmall}
                                                    value={partialData.end}
                                                    onChangeText={(v) => setPartialData(p => ({ ...p, end: formatTimeInput(v) }))}
                                                    placeholder="Fi"
                                                    keyboardType="numeric"
                                                    maxLength={5}
                                                />
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}

                            {selectedStatuses.includes("ROMANENT") && (
                                <View style={styles.genericForm}>
                                    <Text style={styles.formTitle}>CONFIGURACIÓ ROMANENT:</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 15 }}>
                                        {['MATÍ', 'TARDA', 'NIT', 'ESPECIAL'].map(type => {
                                            const isActive = romanentData.type === type;
                                            return (
                                                <TouchableOpacity
                                                    key={type}
                                                    style={[styles.statusChip, { flex: 1, minWidth: '45%', marginBottom: 0, marginRight: 0 }, isActive && { backgroundColor: '#0D47A1', borderColor: '#0D47A1' }]}
                                                    onPress={() => {
                                                        const date = selectedDayData.date;
                                                        let start = "00:00", end = "00:00";
                                                        if (type === "MATÍ") {
                                                            const h = getShiftHours(date, 'M');
                                                            start = h.start; end = h.end;
                                                        } else if (type === "TARDA") {
                                                            const h = getShiftHours(date, 'T');
                                                            start = h.start; end = h.end;
                                                        } else if (type === "NIT") {
                                                            const h = getShiftHours(date, 'N');
                                                            start = h.start; end = h.end;
                                                        } else {
                                                            start = romanentData.start;
                                                            end = romanentData.end;
                                                        }
                                                        setRomanentData({ type, start, end });
                                                    }}
                                                >
                                                    <Text style={[styles.statusChipText, isActive && { color: 'white' }]}>TORN {type}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>

                                    <View style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: 'white',
                                        padding: 12,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor: '#E1E4E8'
                                    }}>
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#555' }}>HORARI:</Text>
                                        <View style={styles.partialInputs}>
                                            <TextInput
                                                style={[styles.timeInputSmall, romanentData.type !== 'ESPECIAL' && { backgroundColor: '#F5F5F5', color: '#888' }]}
                                                value={romanentData.start}
                                                editable={romanentData.type === 'ESPECIAL'}
                                                onChangeText={(v) => setRomanentData(p => ({ ...p, start: formatTimeInput(v) }))}
                                                placeholder="Inici"
                                                keyboardType="numeric"
                                                maxLength={5}
                                            />
                                            <Text style={styles.timeSeparator}>-</Text>
                                            <TextInput
                                                style={[styles.timeInputSmall, romanentData.type !== 'ESPECIAL' && { backgroundColor: '#F5F5F5', color: '#888' }]}
                                                value={romanentData.end}
                                                editable={romanentData.type === 'ESPECIAL'}
                                                onChangeText={(v) => setRomanentData(p => ({ ...p, end: formatTimeInput(v) }))}
                                                placeholder="Fi"
                                                keyboardType="numeric"
                                                maxLength={5}
                                            />
                                        </View>
                                    </View>
                                </View>
                            )}

                            {(currentModifiedByAdmin || actingAsUser) && (
                                <View style={{ backgroundColor: '#FFEBEE', padding: 10, borderRadius: 8, marginTop: 15, marginBottom: 5 }}>
                                    <Text style={{ fontSize: 11, color: '#D32F2F', fontWeight: 'bold', textAlign: 'center' }}>
                                        Modificat per l'administrador
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.sectionLabel}>AFEGEIX MÉS DETALLS:</Text>

                            <TextInput
                                style={styles.noteInput}
                                multiline
                                placeholder="Afegeix més detalls si cal..."
                                value={userNote}
                                onChangeText={setUserNote}
                            />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal >

            {/* Modal de Detalls de l'Usuari (Historial) per a Admin */}
            < Modal
                visible={isUserDetailModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsUserDetailModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalTitle}>Historial d'Anotacions</Text>
                                <Text style={{ fontSize: 13, color: '#666', fontWeight: 'bold' }}>TIP {detailUser?.tip} — {detailUser?.nom}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setIsUserDetailModalVisible(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>TANCAR</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 15 }}>
                            {(() => {
                                const userNotes = [];
                                Object.keys(calendarNotes).forEach(dateStr => {
                                    const dayData = calendarNotes[dateStr];
                                    if (dayData && dayData[detailUser?.tip]) {
                                        userNotes.push({ date: new Date(dateStr), data: dayData[detailUser?.tip] });
                                    }
                                });

                                if (userNotes.length === 0) {
                                    return <Text style={styles.emptyText}>L'agent no té cap anotació registrada.</Text>;
                                }

                                return userNotes.sort((a, b) => b.date - a.date).map((item, idx) => {
                                    const statuses = item.data.statuses || (item.data.status ? [item.data.status] : []);
                                    return (
                                        <View key={idx} style={styles.historyCard}>
                                            <View style={styles.historyHeader}>
                                                <Text style={styles.historyDate}>
                                                    {item.date.toLocaleDateString('ca-ES', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()}
                                                </Text>
                                                <View style={{ flexDirection: 'row' }}>
                                                    {statuses.map((st, i) => (
                                                        <View key={i} style={[styles.miniStatusBadge, { backgroundColor: STATUS_LIGHT_COLORS[st], marginLeft: 5 }]}>
                                                            <Text style={styles.miniStatusText}>{st}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>

                                            {item.data.note ? <Text style={styles.historyNote}>"{item.data.note}"</Text> : null}

                                            {item.data.perllongament && (
                                                <Text style={styles.historySubInfo}>
                                                    {(() => {
                                                        const agInfo = item.data.perllongament.agents?.find(a => String(a?.tip || a) === String(detailUser?.tip));
                                                        if (agInfo && agInfo.hora && agInfo.hora.includes(' - ')) {
                                                            const [h1, h2] = agInfo.hora.split(' - ');
                                                            const d1 = agInfo.data1 || agInfo.data || '';
                                                            const d2 = agInfo.data2 || agInfo.data || '';
                                                            try {
                                                                const [m1h, m1m] = h1.split(':').map(Number);
                                                                const [m2h, m2m] = h2.split(':').map(Number);
                                                                let diff = (m2h * 60 + m2m) - (m1h * 60 + m1m);
                                                                if (diff < 0) diff += 1440;
                                                                return `• Perllongament: ${agInfo.tip} ${h1} ${d1}, ${h2} ${d2}, (${diff}')`;
                                                            } catch (e) {
                                                                return `• Perllongament: ${agInfo.tip} ${agInfo.hora}`;
                                                            }
                                                        }
                                                        return `• Perllongament fins les ${item.data.perllongament.horaFi}`;
                                                    })()}
                                                </Text>
                                            )}
                                            {item.data.judici && (
                                                <Text style={styles.historySubInfo}>• Judici a les {item.data.judici.hora} ({item.data.judici.jutjat} {item.data.judici.numJutgat})</Text>
                                            )}
                                            {item.data.partial && !item.data.fullDay && (
                                                <Text style={styles.historySubInfo}>• Parcial: {item.data.partial.start} - {item.data.partial.end}</Text>
                                            )}
                                            {item.data.fullDay && <Text style={styles.historySubInfo}>• Dia sencer</Text>}
                                        </View>
                                    );
                                });
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal >
        </View >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F7FA", paddingTop: 60 },
    header: { paddingHorizontal: 20, marginBottom: 10 },
    title: { fontSize: 26, fontWeight: "bold", color: COLORS.PRIMARY },
    yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    yearNav: { fontSize: 24, color: COLORS.PRIMARY, paddingHorizontal: 10 },
    grupSelector: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
    grupBtn: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, backgroundColor: '#EEE', marginHorizontal: 4 },
    grupBtnActive: { backgroundColor: COLORS.PRIMARY },
    grupBtnText: { fontSize: 12, color: '#666', fontWeight: 'bold' },
    grupBtnTextActive: { color: 'white' },
    legend: { flexDirection: 'row', marginTop: 10, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
    dotText: { fontSize: 12, fontWeight: 'bold' },
    monthContainer: { paddingHorizontal: 15, marginBottom: 30 },
    monthTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.PRIMARY, marginBottom: 10, marginLeft: 5 },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'white', padding: 10, borderRadius: 15, elevation: 2 },
    dayHeader: { width: "14.28%", textAlign: "center", fontWeight: "bold", color: "#999", marginBottom: 5, fontSize: 12 },
    dayCell: { width: "14.28%", height: 50, justifyContent: "center", alignItems: "center", borderWidth: 0.2, borderColor: "#f0f0f0" },
    dayNumber: { fontSize: 10, position: 'absolute', top: 2, left: 4, fontWeight: '600' },
    turnLabel: { fontSize: 18, fontWeight: 'bold' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, height: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.PRIMARY, flex: 1, marginRight: 5 },
    modalSubtitle: { fontSize: 16, color: '#666', fontWeight: '600', marginBottom: 15 },
    closeBtn: { padding: 8, backgroundColor: '#F0F0F0', borderRadius: 10 },
    closeBtnText: { fontSize: 12, fontWeight: 'bold', color: '#666' },
    detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
    detailInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    detailTip: { fontSize: 14, fontWeight: '900', color: COLORS.PRIMARY, width: 50 },
    detailName: { fontSize: 15, fontWeight: '700', color: '#333' },
    detailCat: { fontSize: 11, color: '#888', fontWeight: 'bold' },
    serviceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 100, alignItems: 'center' },
    serviceText: { fontSize: 11, fontWeight: '800' },
    emptyText: { textAlign: 'center', marginTop: 30, color: '#999', fontStyle: 'italic' },

    // Noves estils
    noteIndicator: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: 'white' },
    detailCard: { backgroundColor: '#F9F9FB', borderRadius: 12, padding: 12, marginBottom: 10 },
    noteBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#EEE' },
    noteLabel: { fontSize: 9, fontWeight: '900', color: '#AAA', letterSpacing: 1 },
    noteText: { fontSize: 13, color: '#555', marginTop: 2, fontStyle: 'italic' },
    noteInput: { backgroundColor: '#F5F5F7', borderRadius: 12, padding: 15, height: 80, fontSize: 16, color: '#333', textAlignVertical: 'top', marginTop: 10 },
    saveNoteBtn: { backgroundColor: COLORS.PRIMARY, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 10, marginBottom: 20 },
    saveNoteBtnText: { color: 'white', fontWeight: '900', fontSize: 14 },

    // Selector Modal
    selectorModalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 15,
        width: '75%',
        alignSelf: 'center',
        marginBottom: 'auto',
        marginTop: 'auto',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10
    },
    selectorTitle: { fontSize: 18, fontWeight: '900', color: COLORS.PRIMARY },
    selectorSubtitle: { fontSize: 12, color: '#888', fontWeight: '600' },
    selectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 8,
        overflow: 'hidden'
    },
    selectorMainAction: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 15,
        justifyContent: 'center'
    },
    selectorBtnText: { fontSize: 13, fontWeight: 'bold' },
    deleteTab: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(0,0,0,0.1)'
    },
    deleteTabText: { fontSize: 9, fontWeight: '900' },
    chevron: { color: '#CCC', fontSize: 14, fontWeight: 'bold' },
    addPermissionBtn: {
        backgroundColor: '#F0F2F5',
        borderStyle: 'dashed',
        borderColor: '#B0B8C1',
        justifyContent: 'center',
        marginTop: 5,
        paddingVertical: 10
    },
    addPermissionText: { color: COLORS.PRIMARY, fontWeight: '800', fontSize: 12 },
    closeBtnSmall: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F0F0F0', borderRadius: 8 },

    // Nous estils usuaris
    sectionLabel: { fontSize: 11, fontWeight: '900', color: '#999', marginTop: 15, marginBottom: 8, letterSpacing: 1 },
    statusOptionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 5 },
    statusChip: {
        backgroundColor: '#F0F2F5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E1E4E8'
    },
    statusChipActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
    statusChipText: { fontSize: 11, fontWeight: 'bold', color: '#666' },
    statusChipTextActive: { color: 'white' },
    statusBadge: {
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFE0B2'
    },
    statusBadgeText: { fontSize: 9, fontWeight: 'bold', color: '#E65100' },
    perllongamentForm: {
        backgroundColor: '#F3F4F9',
        borderRadius: 16,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E1E4F0'
    },
    genericForm: {
        backgroundColor: '#F3F4F9',
        borderRadius: 16,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E1E4F0'
    },
    judiciForm: {
        backgroundColor: '#F3F4F9',
        borderRadius: 16,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E1E4F0'
    },
    formTitle: { fontSize: 11, fontWeight: '800', color: COLORS.PRIMARY, marginBottom: 10, letterSpacing: 0.5 },
    formLabel: { fontSize: 11, fontWeight: '800', color: '#555', marginBottom: 5 },
    formLabelInline: { fontSize: 11, fontWeight: '800', color: '#555', marginRight: 5 },
    formInputCompact: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E1E4E8',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        fontSize: 13,
        marginBottom: 10
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2
    },
    readonlyInput: {
        backgroundColor: '#EEE',
        borderColor: '#DDD',
        justifyContent: 'center'
    },
    pickerContainer: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E1E4E8',
        borderRadius: 8,
        height: 38,
        justifyContent: 'center',
        marginBottom: 10,
        position: 'relative',
        overflow: 'hidden'
    },
    pickerValueText: {
        fontSize: 13,
        paddingLeft: 10,
        color: '#333'
    },
    invisiblePicker: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity: 0,
        backgroundColor: 'transparent'
    },
    plusBtn: {
        backgroundColor: COLORS.PRIMARY,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2
    },
    plusBtnText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    agentsTagList: { flexDirection: 'row', flexWrap: 'wrap' },
    agentTag: {
        backgroundColor: '#EEE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 6,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: '#DDD'
    },
    agentTagText: { fontSize: 11, fontWeight: '700', color: '#333' },
    perllAgentsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    addAgentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: COLORS.PRIMARY,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkboxChecked: { backgroundColor: COLORS.PRIMARY },
    checkboxIcon: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    partialInputs: { flexDirection: 'row', alignItems: 'center' },
    timeInputSmall: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E1E4E8',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        width: 60,
        textAlign: 'center',
        fontSize: 13,
        fontWeight: 'bold'
    },
    timeSeparator: { marginHorizontal: 5, fontWeight: 'bold', color: '#888' },

    // Admin Day Details Styles
    adminTipCircle: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center'
    },
    adminTipText: { color: 'white', fontWeight: '900', fontSize: 13 },
    miniStatusBadgeSupport: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        marginTop: 5,
        minWidth: 90,
        alignItems: 'center'
    },
    miniStatusTextSupport: { fontSize: 11, fontWeight: '800', color: '#333' },
    timeDetailRow: { marginTop: 10, paddingLeft: 55 },
    timeDetailText: { fontSize: 12, fontWeight: '700', color: '#666' },
    adminNoteBox: {
        marginTop: 10,
        marginLeft: 55,
        backgroundColor: '#F0F2F5',
        padding: 10,
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.PRIMARY
    },
    adminNoteText: { fontSize: 14, color: '#555', fontStyle: 'italic' },
    perllDetailsText: { fontSize: 11, color: '#666', marginTop: 2, fontWeight: '600' },
    perllongamentTitle: { fontSize: 10, fontWeight: '900', color: COLORS.PRIMARY, marginTop: 10, letterSpacing: 0.5 },

    // Admin Details Enhanced
    sectionLabelAdmin: { fontSize: 10, fontWeight: '900', color: '#AAA', marginBottom: 10, letterSpacing: 1, marginTop: 10 },
    historyCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#F0F0F0', elevation: 1 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    historyDate: { fontSize: 11, fontWeight: '800', color: '#666' },
    historyNote: { fontSize: 14, color: '#333', fontStyle: 'italic', marginVertical: 5 },
    historySubInfo: { fontSize: 12, fontWeight: '700', color: COLORS.PRIMARY, marginTop: 4 },
    miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, minWidth: 70, alignItems: 'center' },
    miniStatusText: { fontSize: 9, fontWeight: '900' }
});

