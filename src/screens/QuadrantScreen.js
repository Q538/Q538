import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, ActivityIndicator, Modal, Switch, SafeAreaView, Alert, useWindowDimensions, TextInput, KeyboardAvoidingView, Platform, Linking, Image } from "react-native";
import { useState, useEffect, useRef } from "react";
import { getPresence, savePresence, getAssignments, saveAssignments, getPublishedAssignments, savePublishedAssignments, getServiceStatus, saveServiceStatus, getServiceConfigs, saveServiceConfigs, getSelectedGrup, saveSelectedGrup, getAgentDetail, getRotationHistory, saveRotationHistory, getCustomServices, saveCustomServices, getManualAgents, saveManualAgents, getEmailRecipients, addAlert, getCalendarNotes, saveCalendarNotes, getAutoPerlRules } from "../services/database";
import { COLORS } from "../theme/colors";
import { Picker } from "@react-native-picker/picker";

export default function QuadrantScreen({ agents = [], session, activeGrupProp, updateSelectedGrup }) {
    const { width: screenWidth } = useWindowDimensions();
    const scrollRef = useRef(null);
    const verticalScrollRef = useRef(null);
    const layoutMap = useRef({});
    const [loading, setLoading] = useState(true);
    const [fullAgents, setFullAgents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availableDays, setAvailableDays] = useState([]);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [absentAgents, setAbsentAgents] = useState({}); // { dateString: [tip1, tip2] }
    const [assignments, setAssignments] = useState({}); // { dateString: { serviceId: [tip1, tip2] } }
    const [publishedAssignments, setPublishedAssignments] = useState({}); // { dateString: { serviceId: [tip1, tip2] } }
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState(null); // { id: 'GAUDI', name: 'GAUDÍ' }
    const [serviceStatus, setServiceStatus] = useState({}); // { dateString: { serviceId: true/false } }
    const [serviceConfigs, setServiceConfigs] = useState({}); // { serviceId: count }
    const [activeGrup, setActiveGrup] = useState(activeGrupProp || (session?.perfil === "ADMIN" ? 1 : 4));

    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [configTarget, setConfigTarget] = useState(null);
    const [configValue, setConfigValue] = useState("0");

    const [showPendingModal, setShowPendingModal] = useState(false);
    const [pendingAgentAction, setPendingAgentAction] = useState(null);
    const [pendingPossibleServices, setPendingPossibleServices] = useState([]);

    const [passwordPromptVisible, setPasswordPromptVisible] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [onPasswordSuccess, setOnPasswordSuccess] = useState(null);

    const [customServices, setCustomServices] = useState({});
    const [manualAgentsMap, setManualAgentsMap] = useState({});
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renameTarget, setRenameTarget] = useState(null);
    const [renameValue, setRenameValue] = useState("");
    const [manualEntryModalVisible, setManualEntryModalVisible] = useState(false);
    const [manualEntryTarget, setManualEntryTarget] = useState(null);
    const [manualEntryData, setManualEntryData] = useState({ tip1: '', nom1: '', tip2: '', nom2: '' });
    const [calendarNotes, setCalendarNotes] = useState({});

    const STATUS_COLORS = {
        "PERLLONGAMENT": { bg: "#424242", text: "white" },
        "PERMÍS": { bg: "#C8E6C9", text: "#1B5E20" },
        "AP": { bg: "#FFCDD2", text: "#D32F2F" },
        "BAIXA": { bg: "#D32F2F", text: "white" },
        "VACANCES": { bg: "#2E7D32", text: "white" },
        "JUDICI": { bg: "#1565C0", text: "white" },
        "ALTRES": { bg: "#E1BEE7", text: "#4A148C" }
    };

    const STATUS_LIGHT_COLORS = {
        "PERLLONGAMENT": "rgba(66, 66, 66, 0.4)",
        "PERMÍS": "rgba(46, 125, 50, 0.4)",
        "AP": "rgba(211, 47, 47, 0.4)",
        "BAIXA": "rgba(211, 47, 47, 0.4)",
        "VACANCES": "rgba(46, 125, 50, 0.4)",
        "JUDICI": "rgba(21, 101, 192, 0.4)",
        "ALTRES": "rgba(106, 27, 154, 0.4)"
    };

    const isAdmin = session?.perfil === "ADMIN";

    const BASE_SERVICES = [
        { id: 'GAUDI_110', name: 'GAUDI 110', icon: require('../../logos/patrullatge.jpg'), color: COLORS.GAUDI },
        { id: 'GAUDI_120', name: 'GAUDI 120', icon: require('../../logos/patrullatge.jpg'), color: COLORS.GAUDI },
        { id: 'GAUDI_130', name: 'GAUDI 130', icon: require('../../logos/patrullatge.jpg'), color: COLORS.GAUDI },
        { id: 'GAUDI_140', name: 'GAUDI 140', icon: require('../../logos/patrullatge.jpg'), color: COLORS.GAUDI },
        { id: 'GAUDI_ORDRES', name: 'GAUDI ORDRES', icon: require('../../logos/patrullatge.jpg'), color: COLORS.GAUDI },
        { id: '2010', name: 'GAUDI 2010', icon: require('../../logos/paisas.jpg'), color: '#607D8B' },
        { id: '2011', name: 'GAUDI 2011', icon: require('../../logos/paisas.jpg'), color: '#607D8B' },
        { id: 'OAC_BARCELONETA', name: 'OAC BARCELONETA', icon: require('../../logos/oac_barceloneta.jpg'), color: COLORS.OAC_BARCELONETA },
        { id: 'IAD', name: 'INSTRUCCI\u00d3', icon: require('../../logos/instruccio.jpg'), color: COLORS.IAD, needsResponsible: true },
        { id: 'OAC', name: 'OAC', icon: require('../../logos/oac.jpg'), color: COLORS.OAC, needsResponsible: true },
        { id: 'ACD', name: 'CUST\u00d2DIA', icon: require('../../logos/custodia.jpg'), color: COLORS.ACD },
        { id: 'SEGURETAT', name: 'SEGURETAT', icon: require('../../logos/seguretat.jpg'), color: COLORS.SEGURETAT },
        { id: 'INCIDENCIES', name: 'INCID\u00c8NCIES', icon: require('../../logos/incidencies.jpg'), color: COLORS.INCIDENCIES },
    ];

    const EXTRA_GAUDIS = [
        { id: 'GAUDI_141', name: 'GAUDI 141', icon: require('../../logos/patrullatge.jpg'), color: COLORS.GAUDI },
        { id: 'GAUDI_131', name: 'GAUDI 131', icon: require('../../logos/patrullatge.jpg'), color: COLORS.GAUDI },
        { id: 'GAUDI_121', name: 'GAUDI 121', icon: require('../../logos/patrullatge.jpg'), color: COLORS.GAUDI },
        { id: 'GAUDI_111', name: 'GAUDI 111', icon: require('../../logos/patrullatge.jpg'), color: COLORS.GAUDI },
    ];

    const pattern = "TTTTTFFNNNNNNNFFFFFFFMMMMMMMFFFFFFF";

    const getTurnForDate = (date, grup) => {
        const referenceDate = new Date(2026, 1, 2, 12, 0, 0);
        const calcDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
        const diffTime = calcDate.getTime() - referenceDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const startPoint = 7;
        const escamotOffset = (4 - grup) * 7;
        const cyclePosition = (diffDays + startPoint + escamotOffset + 35000) % 35;
        return pattern[cyclePosition];
    };

    const getShiftHours = (date, turn) => {
        if (!date || !turn) return { start: "00:00", end: "00:00" };
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

    // Cargar datos guardados y agentes
    useEffect(() => {
        const initialization = async () => {
            setLoading(true);

            // Preferencias
            const savedAbsence = await getPresence();
            setAbsentAgents(savedAbsence);

            const savedAssignments = await getAssignments(activeGrup);
            setAssignments(savedAssignments);

            const savedPublished = await getPublishedAssignments(activeGrup);
            setPublishedAssignments(savedPublished);

            const savedStatus = await getServiceStatus();
            setServiceStatus(savedStatus);

            const savedConfigs = await getServiceConfigs();
            setServiceConfigs(savedConfigs);

            const savedGrup = await getSelectedGrup();
            if (activeGrupProp) setActiveGrup(activeGrupProp);
            else if (savedGrup) setActiveGrup(savedGrup);

            const savedCustom = await getCustomServices();
            setCustomServices(savedCustom);

            const savedManualAgents = await getManualAgents();
            setManualAgentsMap(savedManualAgents);

            const savedNotes = await getCalendarNotes();
            setCalendarNotes(savedNotes);

            // Agentes
            const enrichedAgents = await Promise.all(
                agents.map(async (agent) => {
                    const saved = await getAgentDetail(agent.tip);
                    // Prioritzem sempre les dades de la fitxa (saved) incloent el nom
                    if (saved) {
                        return {
                            ...agent,
                            ...saved,
                            nom: saved.nom || agent.nom // Garantir que el nom de la fitxa guanya
                        };
                    }
                    return { ...agent, funcions: {} };
                })
            );
            setFullAgents(enrichedAgents);
            setLoading(false);
        };
        initialization();
    }, [agents, activeGrupProp]);

    useEffect(() => {
        if (activeGrupProp) setActiveGrup(activeGrupProp);
    }, [activeGrupProp]);

    useEffect(() => {
        const days = [];
        // Definimos el rango del año: del 1 de Enero de 2026 al 31 de Enero de 2027
        let current = new Date(2026, 0, 1); // 1 Ene 2026
        const endDate = new Date(2027, 0, 31); // 31 Ene 2027

        while (current <= endDate) {
            const turn = getTurnForDate(current, activeGrup);
            if (turn !== 'F') { // Solo añadimos los días que se trabaja ('M', 'T' o 'N')
                days.push({
                    date: new Date(current),
                    turn,
                    label: current.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()
                });
            }
            current.setDate(current.getDate() + 1);
        }
        setAvailableDays(days);

        // Centrar en el día actual o el más cercano
        if (days.length > 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let targetIndex = days.findIndex(d => {
                const dDate = new Date(d.date);
                dDate.setHours(0, 0, 0, 0);
                return dDate >= today;
            });

            if (targetIndex === -1) targetIndex = 0;
            const initialDate = days[targetIndex].date;
            setSelectedDate(initialDate);

            // Delay per assegurar que el ScrollView i els ítems estan totalment renderitzats
            setTimeout(() => {
                scrollToDate(initialDate, days);
            }, 1500);
        }
    }, [activeGrup, loading]);

    const scrollToDate = (date, days = availableDays) => {
        if (scrollRef.current && days.length > 0) {
            const index = days.findIndex(d => d.date.toDateString() === date.toDateString());
            if (index !== -1) {
                scrollRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
            }
        }
    };

    const handleDateSelect = (date) => {
        setSelectedDate(date);
        scrollToDate(date);
    };

    const activeTurnKey = getTurnForDate(selectedDate, activeGrup);
    const shiftHours = getShiftHours(selectedDate, activeTurnKey);
    const activeTurnLabel = (activeTurnKey === 'M' ? 'MAT\u00cd' : activeTurnKey === 'T' ? 'TARDA' : activeTurnKey === 'N' ? 'NIT' : '') + (activeTurnKey !== 'F' ? ` (${shiftHours.start} - ${shiftHours.end})` : '');
    const dateKey = selectedDate.toDateString();

    const currentAbsentList = absentAgents[dateKey] ?? [];
    const availableAgents = fullAgents.filter(a => !currentAbsentList.includes(String(a.tip).trim()));

    const currentAssignments = isAdmin ? (assignments[dateKey] || {}) : (publishedAssignments[dateKey] || {});
    const allAssignedTips = Object.values(currentAssignments).flat();

    // Auto-scroll al indicatiu de l'usuari
    useEffect(() => {
        if (!loading && session?.user?.tip) {
            const userTipStr = String(session.user.tip).trim();
            let foundServiceId = null;

            // Buscar en indicatius normals i estàtics
            for (const [srvId, tips] of Object.entries(currentAssignments)) {
                if (Array.isArray(tips) && tips.includes(userTipStr)) {
                    foundServiceId = srvId;
                    break;
                }
            }

            // Si no s'ha trobat, buscar si l'usuari és un dels Mandos
            if (!foundServiceId) {
                const isMando = mandos.find(m => String(m.tip).trim() === userTipStr);
                if (isMando) {
                    foundServiceId = `MANDO_${userTipStr}`;
                }
            }

            if (foundServiceId) {
                // Donem un petit marge per a que el layout s'actualitzi
                setTimeout(() => {
                    const y = layoutMap.current[foundServiceId];
                    if (y !== undefined && verticalScrollRef.current) {
                        verticalScrollRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
                    }
                }, 500);
            }
        }
    }, [selectedDate, loading, assignments]);

    const toggleAgentPresence = (tip) => {
        if (!isAdmin) {
            Alert.alert("Accés Denegat", "Has d'estar en mode administrador per canviar la disponibilitat.");
            return;
        }
        const tipStr = String(tip).trim();
        const currentDateKey = selectedDate.toDateString();
        setAbsentAgents(prev => {
            const currentList = prev[currentDateKey] || [];
            const isAlreadyAbsent = currentList.includes(tipStr);
            let newList = isAlreadyAbsent ? currentList.filter(t => t !== tipStr) : [...currentList, tipStr];
            const newState = { ...prev, [currentDateKey]: newList };
            savePresence(activeGrup, newState);
            return newState;
        });
    };

    const sargentos = availableAgents.filter(a =>
        a.categoria === "SERGENT" &&
        !allAssignedTips.includes(String(a.tip).trim())
    );

    // Els caporals només tenen indicatiu GAUDI si NO estan assignats a una responsabilitat estàtica (IAD/OAC)
    const caporalesParaIndicativo = availableAgents
        .filter(a => {
            if (a.categoria !== "CAPORAL") return false;
            const tipStr = String(a.tip).trim();

            // Si ja està assignat a qualsevol altre servei (OAC, patrulla, etc), no pot ser mando
            if (allAssignedTips.includes(tipStr)) return false;

            const isStaticResp = (currentAssignments['IAD_RESP'] || []).includes(tipStr) ||
                (currentAssignments['OAC_RESP'] || []).includes(tipStr);
            return !isStaticResp;
        })
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const mandos = [
        ...sargentos.map(s => ({ ...s, indicativo: "GAUDI 100", icon: require('../../logos/mando.jpg') })),
        ...caporalesParaIndicativo.map((c, idx) => {
            const index = sargentos.length > 0 ? idx + 1 : idx;
            return { ...c, indicativo: `GAUDI 10${index}`, icon: require('../../logos/mando.jpg') };
        })
    ];

    const handleAssignAgent = (serviceId, tip) => {
        if (!isAdmin) return;
        const tipStr = String(tip).trim();
        setAssignments(prev => {
            const dayAssigns = prev[dateKey] || {};

            // 1. Eliminar l'agent de qualsevol altre servei on estigui assignat avui
            const updatedDay = { ...dayAssigns };
            Object.keys(updatedDay).forEach(key => {
                if (Array.isArray(updatedDay[key])) {
                    updatedDay[key] = updatedDay[key].filter(t => String(t).trim() !== tipStr);
                }
            });

            // 2. Afegir-lo al nou servei
            const serviceAssigns = updatedDay[serviceId] || [];
            if (!serviceAssigns.includes(tipStr)) {
                updatedDay[serviceId] = [...serviceAssigns, tipStr];
            }

            const newState = { ...prev, [dateKey]: updatedDay };
            saveAssignments(activeGrup, newState);
            return newState;
        });
        setShowAssignModal(false);
        if (showPendingModal) setShowPendingModal(false);
    };

    const handleRemoveAssignment = (serviceId, tip) => {
        if (!isAdmin) return;
        const tipStr = String(tip).trim();
        setAssignments(prev => {
            const dayAssigns = prev[dateKey] || {};
            const serviceAssigns = dayAssigns[serviceId] || [];
            const updatedService = serviceAssigns.filter(t => t !== tipStr);
            const updatedDay = { ...dayAssigns, [serviceId]: updatedService };
            const newState = { ...prev, [dateKey]: updatedDay };
            saveAssignments(newState);
            return newState;
        });
    };

    const toggleServiceStatus = (serviceId) => {
        if (!isAdmin) return;
        setServiceStatus(prev => {
            const dayStatus = prev[dateKey] || {};
            const currentVal = dayStatus[serviceId] !== false;
            const updatedDay = { ...dayStatus, [serviceId]: !currentVal };
            const newState = { ...prev, [dateKey]: updatedDay };
            saveServiceStatus(activeGrup, newState);
            return newState;
        });
    };

    const handleConfigureService = (serviceId, currentName) => {
        if (!isAdmin) return;
        const currentCount = serviceConfigs[serviceId] || 0;
        setConfigTarget({ id: serviceId, name: currentName });
        setConfigValue(String(currentCount));
        setConfigModalVisible(true);
    };

    const saveServiceConfig = () => {
        const n = parseInt(configValue);
        if (isNaN(n) || n < 0) return Alert.alert("Error", "Introdueix un número vàlid");

        setServiceConfigs(prev => {
            const newState = { ...prev, [configTarget.id]: n };
            saveServiceConfigs(activeGrup, newState);
            return newState;
        });
        setConfigModalVisible(false);
    };

    const handleAddManualService = () => {
        if (!isAdmin) return;
        const newId = `MANUAL_${Date.now()}`;
        const newService = { id: newId, name: 'NOU INDICATIU', icon: '🚓', color: COLORS.GAUDI, isManual: true };

        setCustomServices(prev => {
            const dayCustom = prev[dateKey] || [];
            const newState = { ...prev, [dateKey]: [...dayCustom, newService] };
            saveCustomServices(activeGrup, newState);
            return newState;
        });
    };

    const handleRenameManualService = (id, currentName) => {
        if (!isAdmin) return;
        setRenameTarget({ id, name: currentName });
        setRenameValue(currentName);
        setRenameModalVisible(true);
    };

    const saveRename = () => {
        setCustomServices(prev => {
            const dayCustom = prev[dateKey] || [];
            const updatedDay = dayCustom.map(s => s.id === renameTarget.id ? { ...s, name: renameValue } : s);
            const newState = { ...prev, [dateKey]: updatedDay };
            saveCustomServices(activeGrup, newState);
            return newState;
        });
        setRenameModalVisible(false);
    };

    const handleManualEntryPress = (serviceId) => {
        if (!isAdmin) return;
        setManualEntryTarget(serviceId);
        setManualEntryData({ tip1: '', nom1: '', tip2: '', nom2: '' });
        setManualEntryModalVisible(true);
    };

    const saveManualEntry = () => {
        const { tip1, nom1, tip2, nom2 } = manualEntryData;

        // Comprovar que no s'usin TIPs d'agents oficials
        const officialTips = fullAgents.map(a => String(a.tip).trim());
        if (officialTips.includes(String(tip1).trim()) || officialTips.includes(String(tip2).trim())) {
            return Alert.alert("Error", "Un dels TIPs ja pertany a un agent de l'escamot. Usa el botó ASSIGNAR per a agents oficials.");
        }

        const newTips = [];
        const newMap = { ...manualAgentsMap };

        if (tip1 && nom1) {
            newTips.push(String(tip1).trim());
            newMap[String(tip1).trim()] = nom1;
        }
        if (tip2 && nom2) {
            newTips.push(String(tip2).trim());
            newMap[String(tip2).trim()] = nom2;
        }

        if (newTips.length === 0) return Alert.alert("Error", "Introdueix almenys un agent");

        setManualAgentsMap(newMap);
        saveManualAgents(activeGrup, newMap);

        setAssignments(prev => {
            const dayAssigns = prev[dateKey] || {};
            const serviceAssigns = dayAssigns[manualEntryTarget] || [];
            // Evitar duplicats en el mateix servei
            const filteredNewTips = newTips.filter(t => !serviceAssigns.includes(t));
            const newState = { ...prev, [dateKey]: { ...dayAssigns, [manualEntryTarget]: [...serviceAssigns, ...filteredNewTips] } };
            saveAssignments(newState);
            return newState;
        });

        setManualEntryModalVisible(false);
    };

    const handleDeleteManualService = (id) => {
        if (!isAdmin) return;
        Alert.alert(
            "Eliminar Indicatiu",
            "Estàs segur que vols eliminar aquest indicatiu manual?",
            [
                { text: "Cancel·lar", style: "cancel" },
                {
                    text: "Eliminar",
                    style: "destructive",
                    onPress: () => {
                        setCustomServices(prev => {
                            const dayCustom = prev[dateKey] || [];
                            const updatedDay = dayCustom.filter(s => s.id !== id);
                            const newState = { ...prev, [dateKey]: updatedDay };
                            saveCustomServices(newState);
                            return newState;
                        });
                        // Netejar assignacions
                        setAssignments(prev => {
                            const dayAssigns = prev[dateKey] || {};
                            if (dayAssigns[id]) {
                                const newDay = { ...dayAssigns };
                                delete newDay[id];
                                const newState = { ...prev, [dateKey]: newDay };
                                saveAssignments(newState);
                                return newState;
                            }
                            return prev;
                        });
                    }
                }
            ]
        );
    };

    const handlePendingAgentPress = (agent) => {
        if (!isAdmin) return;

        const possible = [];

        // 1. Mandos (GAUDI100, 101, 102...)
        mandos.forEach(m => {
            possible.push({ id: `MANDO_${m.tip}`, name: m.indicativo });
        });

        // 2. Patrulles GAUDI (Intercalades 110, 111, 120, 121...)
        const gaudiPairs = [
            ['GAUDI_110', 'GAUDI_111'],
            ['GAUDI_120', 'GAUDI_121'],
            ['GAUDI_130', 'GAUDI_131'],
            ['GAUDI_140', 'GAUDI_141']
        ];

        gaudiPairs.forEach(([mainId, extraId]) => {
            const main = BASE_SERVICES.find(s => s.id === mainId);
            if (main && isServiceActive(mainId)) possible.push({ id: main.id, name: main.name });

            const extra = EXTRA_GAUDIS.find(s => s.id === extraId);
            if (extra && isServiceActive(extraId)) possible.push({ id: extra.id, name: extra.name });
        });

        // 3. Altres Patrulles (ORDRES + PAISA)
        const others = [...BASE_SERVICES.filter(s => s.id === 'GAUDI_ORDRES' || s.id === '2010' || s.id === '2011')];
        others.forEach(s => {
            if (isServiceActive(s.id)) possible.push({ id: s.id, name: s.name });
        });

        // 4. Manuals
        const currentCustom = customServices[dateKey] || [];
        currentCustom.forEach(s => {
            possible.push({ id: s.id, name: s.name });
        });

        // 5. Serveis Estàtics (OAC, IAD...)
        BASE_SERVICES.filter(s => !s.id.startsWith('GAUDI_') && !['2010', '2011'].includes(s.id)).forEach(s => {
            if (!isServiceActive(s.id)) return;
            possible.push({ id: s.id, name: s.name });
        });

        if (possible.length === 0) {
            Alert.alert("Cap servei actiu", "No hi ha cap servei actiu actualment al quadrant.");
            return;
        }

        setPendingPossibleServices(possible);
        setPendingAgentAction(agent);
    };

    const handleAutoPlan = async () => {
        if (!isAdmin) return;

        Alert.alert(
            "Planificació Automàtica",
            `Això sobreescriurà la planificació del día ${selectedDate.toLocaleDateString('ca-ES')}. Vols continuar?`,
            [
                { text: "Cancel·lar", style: "cancel" },
                {
                    text: "Generar",
                    onPress: async () => {
                        const currentAssignments = assignments[dateKey] || {};
                        const manuallyAssignedTips = Object.values(currentAssignments).flat();

                        // Pool d'agents i mandos lliures
                        let pool = availableAgents.filter(a => !manuallyAssignedTips.includes(String(a.tip).trim()));
                        const newAssignments = { ...currentAssignments };

                        // 1. Carregar Historial de Rotació Global
                        const history = await getRotationHistory();

                        // Helper per determinar si un servei és estàtic o patrulla
                        const STATIC_IDS = ['OAC', 'IAD', 'ACD', 'SEGURETAT', 'OAC_BARCELONETA', 'INCIDENCIES', 'OAC_RESP', 'IAD_RESP'];

                        // Preparar agents per la rotació
                        const prepareAgent = (agent) => {
                            const tip = String(agent.tip).trim();
                            const entry = history[tip] || { lastType: 'PATROL', lastStaticId: null, lastPartner: null, lastCallsign: null };

                            // Llista de funcions estàtiques que pot fer aquest agent
                            const staticFunctions = STATIC_IDS.filter(id => {
                                const baseId = id.replace('_RESP', '');
                                if (id === 'OAC_RESP') return agent.categoria === 'CAPORAL' || agent.funcions?.OAC_RESP;
                                if (id === 'IAD_RESP') return agent.categoria === 'CAPORAL';
                                return agent.funcions && agent.funcions[baseId];
                            });

                            return {
                                ...agent,
                                tip,
                                lastType: entry.lastType,
                                lastStaticId: entry.lastStaticId,
                                lastPartner: entry.lastPartner,
                                lastCallsign: entry.lastCallsign,
                                staticFunctions,
                                dueFor: entry.lastType === 'PATROL' ? 'STATIC' : 'PATROL'
                            };
                        };

                        const enrichedPool = pool.map(prepareAgent);

                        // Separar per categoria i deure (el que els toca avui)
                        let cabos = enrichedPool.filter(a => a.categoria === "CAPORAL").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                        let agentsArr = enrichedPool.filter(a => a.categoria === "AGENT").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
                        let sergents = enrichedPool.filter(a => a.categoria === "SERGENT").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

                        // --- FUNCIÓ PER ASSIGNAR PRIORITZANT ROTACIÓ ---
                        const assignService = (serviceId, candidates, isStatic = true, targetAgent = null) => {
                            if (!isServiceActive(serviceId)) return null;
                            const capacity = (serviceId.endsWith('_RESP')) ? 1 : (serviceConfigs[serviceId] || 0);
                            if (capacity === 0 && !serviceId.startsWith('GAUDI') && !serviceId.startsWith('MANDO')) return null;

                            const alreadyAssigned = newAssignments[serviceId] || [];
                            const slotsToFill = (serviceId.startsWith('GAUDI')) ? 2 : (serviceId.startsWith('MANDO') ? 1 : capacity);
                            const needed = slotsToFill - alreadyAssigned.length;

                            if (needed <= 0) return null;

                            // Ordenar candidats: 
                            const sorted = candidates.sort((a, b) => {
                                // 1. Rotació (dueFor)
                                if (a.dueFor === (isStatic ? 'STATIC' : 'PATROL') && b.dueFor !== (isStatic ? 'STATIC' : 'PATROL')) return -1;
                                if (a.dueFor !== (isStatic ? 'STATIC' : 'PATROL') && b.dueFor === (isStatic ? 'STATIC' : 'PATROL')) return 1;

                                // 2. No repetir indicatiu (Callsign)
                                if (a.lastCallsign === serviceId && b.lastCallsign !== serviceId) return 1;
                                if (a.lastCallsign !== serviceId && b.lastCallsign === serviceId) return -1;

                                // 3. No repetir parella (si tenim targetAgent)
                                if (targetAgent) {
                                    const aWasPartner = a.lastPartner?.split(',').includes(targetAgent.tip);
                                    const bWasPartner = b.lastPartner?.split(',').includes(targetAgent.tip);
                                    if (aWasPartner && !bWasPartner) return 1;
                                    if (!aWasPartner && bWasPartner) return -1;

                                    // 4. Evitar binomis de dues dones (si targetAgent és dona, prioritzem homes)
                                    if (targetAgent.sexe === 'DONA') {
                                        if (a.sexe === 'DONA' && b.sexe === 'HOME') return 1;
                                        if (a.sexe === 'HOME' && b.sexe === 'DONA') return -1;
                                    }

                                    // 5. Equilibrar TIPs (Més llunyà al targetAgent) - Com a últim criteri
                                    const distA = Math.abs(parseInt(a.tip) - parseInt(targetAgent.tip));
                                    const distB = Math.abs(parseInt(b.tip) - parseInt(targetAgent.tip));
                                    if (distA !== distB) return distB - distA;
                                }

                                if (isStatic) {
                                    // Rotació de funcions estàtiques específica
                                    if (a.lastStaticId !== serviceId && b.lastStaticId === serviceId) return -1;
                                    if (a.lastStaticId === serviceId && b.lastStaticId !== serviceId) return 1;
                                }
                                return 0;
                            });

                            const selected = sorted.slice(0, needed);
                            if (selected.length > 0) {
                                if (!newAssignments[serviceId]) newAssignments[serviceId] = [];
                                selected.forEach(s => {
                                    newAssignments[serviceId].push(s.tip);
                                    s.assignedNow = true;
                                });
                                return selected;
                            }
                            return null;
                        };

                        // --- EXECUCIÓ DE LA PLANIFICACIÓ (Seguint prioritat de l'usuari) ---

                        // 1. PRIORITAT: SERVEIS ESTÀTICS (Responsables + Posicions)
                        const totalWorkingCabos = cabos.length;
                        const maxCabosForStatic = totalWorkingCabos <= 2 ? 1 : totalWorkingCabos;
                        let cabosAssignedToStaticCount = 0;

                        // IAD_RESP: NOMÉS CABOS
                        let iadChosen = null;
                        if (cabosAssignedToStaticCount < maxCabosForStatic) {
                            let iadCaboCandidates = cabos.filter(c => !c.assignedNow && c.dueFor === 'STATIC');
                            if (iadCaboCandidates.length === 0 && totalWorkingCabos > 2) {
                                iadCaboCandidates = cabos.filter(c => !c.assignedNow);
                            }
                            iadChosen = assignService('IAD_RESP', iadCaboCandidates, true);
                            if (iadChosen) cabosAssignedToStaticCount++;
                        }

                        // OAC_RESP: CABOS primer (si queda quota), després AGENTS acreditats
                        let oacCaboChosenResult = null;
                        if (cabosAssignedToStaticCount < maxCabosForStatic) {
                            let oacCaboCandidates = cabos.filter(c => !c.assignedNow && c.dueFor === 'STATIC');
                            if (oacCaboCandidates.length === 0 && (totalWorkingCabos > 2 || cabosAssignedToStaticCount === 0)) {
                                oacCaboCandidates = cabos.filter(c => !c.assignedNow);
                            }
                            oacCaboChosenResult = assignService('OAC_RESP', oacCaboCandidates, true);
                            if (oacCaboChosenResult) cabosAssignedToStaticCount++;
                        }

                        if (!oacCaboChosenResult) {
                            let agentOacCandidates = agentsArr.filter(a => !a.assignedNow && a.staticFunctions.includes('OAC_RESP'));
                            assignService('OAC_RESP', agentOacCandidates, true);
                        }

                        ['OAC', 'IAD', 'ACD', 'SEGURETAT', 'OAC_BARCELONETA', 'INCIDENCIES'].forEach(srvId => {
                            let candidates = agentsArr.filter(a => !a.assignedNow && a.staticFunctions.includes(srvId));
                            assignService(srvId, candidates, true);
                        });

                        // 2. PRIORITAT: MANDOS - SERGENT (Sempre primer mando)
                        sergents.filter(s => !s.assignedNow).forEach(m => {
                            const mandoKey = `MANDO_${m.tip}`;
                            let partnerCandidates = agentsArr.filter(a => !a.assignedNow);
                            if (partnerCandidates.length === 0) {
                                partnerCandidates = enrichedPool.filter(a => !a.assignedNow && a.tip !== m.tip);
                            }
                            assignService(mandoKey, partnerCandidates, false, m);
                            m.assignedNow = true;
                        });

                        // 3. PRIORITAT: MANDOS - CAPORALS (Per ordre de prelació/createdAt)
                        // Filtramos cabos que NO tengan que hacer estático hoy si es posible
                        let caboMandoPool = cabos.filter(c => !c.assignedNow && c.dueFor === 'PATROL');
                        if (caboMandoPool.length === 0) caboMandoPool = cabos.filter(c => !c.assignedNow);

                        caboMandoPool.forEach(m => {
                            const mandoKey = `MANDO_${m.tip}`;
                            let partnerCandidates = agentsArr.filter(a => !a.assignedNow);
                            if (partnerCandidates.length === 0) {
                                partnerCandidates = enrichedPool.filter(a => !a.assignedNow && a.tip !== m.tip);
                            }
                            assignService(mandoKey, partnerCandidates, false, m);
                            m.assignedNow = true;
                        });

                        // 4. PRIORITAT: PATRULLES (Paisa + GAUDI)
                        ['2010', '2011'].forEach(srvId => {
                            let candidates = agentsArr.filter(a => !a.assignedNow && a.funcions?.PAISA);
                            assignService(srvId, candidates, false);
                        });

                        const patrols = [
                            'GAUDI_110', 'GAUDI_120', 'GAUDI_130', 'GAUDI_140', 'GAUDI_ORDRES',
                            'GAUDI_141', 'GAUDI_131', 'GAUDI_121', 'GAUDI_111'
                        ];

                        patrols.forEach(srvId => {
                            // Primer agent
                            let candidates = enrichedPool.filter(a => !a.assignedNow);
                            let firstAgent = assignService(srvId, candidates, false);
                            if (firstAgent && firstAgent.length > 0) {
                                // Segon agent equilibrat
                                let nextCandidates = enrichedPool.filter(a => !a.assignedNow);
                                assignService(srvId, nextCandidates, false, firstAgent[0]);
                            }
                        });

                        // Actualizar Historial de Rotación Global con todos los datos
                        Object.keys(newAssignments).forEach(serviceId => {
                            const partnerTips = newAssignments[serviceId];
                            const isStatic = STATIC_IDS.includes(serviceId.replace('_RESP', ''));

                            // Si es un mando, el mando es el tip y partnerTips es el binomio
                            if (serviceId.startsWith('MANDO_')) {
                                const mandoTip = serviceId.replace('MANDO_', '');
                                const partnerTip = partnerTips[0]; // Los mandos solo tienen 1 partner

                                // Actualizar mando
                                history[mandoTip] = {
                                    lastType: 'PATROL',
                                    lastStaticId: history[mandoTip]?.lastStaticId || null,
                                    lastPartner: partnerTip || null,
                                    lastCallsign: 'MANDO'
                                };

                                // Actualizar partner
                                if (partnerTip) {
                                    history[partnerTip] = {
                                        lastType: 'PATROL',
                                        lastStaticId: history[partnerTip]?.lastStaticId || null,
                                        lastPartner: mandoTip,
                                        lastCallsign: 'MANDO'
                                    };
                                }
                            } else {
                                // Patrullas o estáticos
                                partnerTips.forEach(tip => {
                                    const others = partnerTips.filter(t => t !== tip);
                                    history[tip] = {
                                        lastType: isStatic ? 'STATIC' : 'PATROL',
                                        lastStaticId: isStatic ? serviceId : (history[tip]?.lastStaticId || null),
                                        lastPartner: others.join(','),
                                        lastCallsign: serviceId
                                    };
                                });
                            }
                        });

                        // Guardar canvis
                        await saveRotationHistory(activeGrup, history);
                        setAssignments(prev => {
                            const newState = { ...prev, [dateKey]: newAssignments };
                            saveAssignments(activeGrup, newState);
                            return newState;
                        });

                        // --- GENERACIÓ AUTOMÀTICA DE PERLLONGAMENTS ---
                        const rules = await getAutoPerlRules();
                        const findRule = (id) => rules.find(r => r.id === id) || { motiu: 'Novetats', anticipament: 0, perllongament: 0 };

                        const newNotes = { ...calendarNotes };
                        if (!newNotes[dateKey]) newNotes[dateKey] = {};

                        const shift = getShiftHours(selectedDate, activeTurnKey);
                        if (shift.start !== "00:00") {
                            const subtractMinutes = (time, mins) => {
                                if (mins <= 0) return time;
                                let [h, m] = time.split(':').map(Number);
                                let d = new Date(2000, 0, 1, h, m);
                                d.setMinutes(d.getMinutes() - mins);
                                return d.toTimeString().slice(0, 5);
                            };
                            const addMinutes = (time, mins) => {
                                if (mins <= 0) return time;
                                let [h, m] = time.split(':').map(Number);
                                let d = new Date(2000, 0, 1, h, m);
                                d.setMinutes(d.getMinutes() + mins);
                                return d.toTimeString().slice(0, 5);
                            };

                            const createAutoPerl = (tip, ruleId) => {
                                if (!tip) return;
                                const rule = findRule(ruleId);
                                if (rule.anticipament === 0 && rule.perllongament === 0) return;

                                const tipStr = String(tip).trim();
                                if (!newNotes[dateKey][tipStr]) newNotes[dateKey][tipStr] = { statuses: [], note: "" };
                                if (!newNotes[dateKey][tipStr].statuses.includes("PERLLONGAMENT")) {
                                    newNotes[dateKey][tipStr].statuses.push("PERLLONGAMENT");
                                }

                                // Calculate start and end times based on rule
                                let startTime, endTime;

                                if (rule.perllongament === 0) {
                                    // Only anticipament (e.g., 30 min before shift start to shift start)
                                    startTime = subtractMinutes(shift.start, rule.anticipament);
                                    endTime = shift.start;
                                } else {
                                    // Both anticipament and perllongament (e.g., OAC agent)
                                    startTime = subtractMinutes(shift.start, rule.anticipament);
                                    endTime = addMinutes(shift.end, rule.perllongament);
                                }

                                newNotes[dateKey][tipStr].perllongament = {
                                    startTime: startTime,
                                    endTime: endTime,
                                    motiu: rule.motiu,
                                    agents: [tipStr]
                                };
                            };

                            // 1. GAUDI 100
                            if (mandos.length > 0) {
                                createAutoPerl(mandos[0].tip, 'gaudi100');
                            }

                            // 2. IAD_RESP (Si és Caporal)
                            const iadResp = newAssignments['IAD_RESP'] || [];
                            if (iadResp.length > 0) {
                                const agent = fullAgents.find(a => String(a.tip) === String(iadResp[0]));
                                if (agent?.categoria === "CAPORAL") {
                                    createAutoPerl(agent.tip, 'iad_resp');
                                }
                            }

                            // 3. OAC_RESP
                            const oacResp = newAssignments['OAC_RESP'] || [];
                            if (oacResp.length > 0) {
                                const agent = fullAgents.find(a => String(a.tip) === String(oacResp[0]));
                                if (agent?.categoria === "CAPORAL") {
                                    createAutoPerl(agent.tip, 'oac_resp_cap');
                                } else if (agent?.categoria === "AGENT") {
                                    createAutoPerl(agent.tip, 'oac_resp_agt');
                                }
                            }

                            // 4. INCIDENCIES
                            const incs = newAssignments['INCIDENCIES'] || [];
                            incs.forEach(tip => {
                                createAutoPerl(tip, 'incidencies');
                            });

                            // 5. CUSTÒDIA (ACD) - El TIP més baix
                            const acds = newAssignments['ACD'] || [];
                            if (acds.length > 0) {
                                const lowestTip = [...acds].sort((a, b) => parseInt(a) - parseInt(b))[0];
                                createAutoPerl(lowestTip, 'custodia');
                            }

                            setCalendarNotes(newNotes);
                            await saveCalendarNotes(newNotes);
                        }
                    }
                }
            ]
        );
    };

    const handleResetPlanning = () => {
        if (!isAdmin) return;

        setPasswordInput("");
        setOnPasswordSuccess(() => () => {
            Alert.alert(
                "Estàs segur?",
                `Vols esborrar tota la planificació del día ${selectedDate.toLocaleDateString('ca-ES')}?`,
                [
                    { text: "No, sortir", style: "cancel" },
                    {
                        text: "Sí, esborrar",
                        style: "destructive",
                        onPress: async () => {
                            setAssignments(prev => {
                                const newState = { ...prev, [dateKey]: {} };
                                saveAssignments(activeGrup, newState);
                                return newState;
                            });
                        }
                    }
                ]
            );
        });
        setPasswordPromptVisible(true);
    };

    const confirmPassword = () => {
        const adminPasswords = {
            1: "19531",
            2: "19532",
            3: "19533",
            4: "19538",
            5: "19535"
        };
        const correctPassword = adminPasswords[activeGrup];

        if (passwordInput === correctPassword) {
            setPasswordPromptVisible(false);
            if (onPasswordSuccess) onPasswordSuccess();
        } else {
            Alert.alert("Error", "Contrasenya incorrecta");
        }
    };

    const handlePublishAlert = async () => {
        // Comprovar si ja hi havia alguna cosa publicada per aquest dia
        const alreadyPublished = publishedAssignments[dateKey] && Object.keys(publishedAssignments[dateKey]).length > 0;

        if (!alreadyPublished) {
            const dateStr = selectedDate.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            await addAlert("ALL", `Disponible la planificació del ${dateStr}`, selectedDate);
            return true; // S'ha enviat la primera alerta
        }
        return false; // Ja estava publicat, no enviem alerta duplicada
    };

    const handleSendEmail = async () => {
        if (!isAdmin) return;

        const recipients = await getEmailRecipients();
        if (!recipients) {
            return Alert.alert("Configuració pendent", "Has de definir almenys un correu de destinació a l'apartat de Configuració.");
        }

        const dateStr = selectedDate.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        let body = `QUADRANT - ${dateStr.toUpperCase()}\n`;
        body += `ESC ${activeGrup} - TORN: ${activeTurnLabel}\n`;
        body += `-------------------------------------------\n\n`;

        // 1. MANDOS
        if (mandos.length > 0) {
            body += `MANDOS:\n`;
            mandos.forEach(m => {
                const mandoId = `MANDO_${m.tip}`;
                const binomiTips = currentAssignments[mandoId] || [];
                const binomiNames = binomiTips.map(t => {
                    const a = fullAgents.find(ag => String(ag.tip) === t) || { nom: manualAgentsMap[t] || t };
                    return `${t} (${a.nom})`;
                });
                body += `• ${m.indicativo}: ${m.tip} (${m.nom}) ${binomiNames.length > 0 ? `| Binomi: ${binomiNames.join(', ')}` : ''}\n`;
            });
            body += `\n`;
        }

        // 2. PATRULLES (D'acord amb l'ordre de la pantalla)
        const currentCustom = customServices[dateKey] || [];
        const mandoTips = mandos.map(m => String(m.tip).trim());
        const allAssignedTips = Object.values(currentAssignments).flat();
        const unassignedAgents = availableAgents.filter(a =>
            !allAssignedTips.includes(String(a.tip).trim()) &&
            !mandoTips.includes(String(a.tip).trim())
        );

        const baseMandatoryIds = ['GAUDI_110', 'GAUDI_111', 'GAUDI_120', 'GAUDI_121', 'GAUDI_130', 'GAUDI_131', 'GAUDI_140', 'GAUDI_141', 'GAUDI_ORDRES', '2010', '2011', 'OAC', 'IAD', 'ACD', 'SEGURETAT'];
        const allBasePlanned = baseMandatoryIds.every(id => {
            if (!isServiceActive(id)) return true;
            const hasDotacio = (currentAssignments[id] || []).length > 0;
            const hasResp = (currentAssignments[`${id}_RESP`] || []).length > 0;
            return hasDotacio || hasResp;
        });

        let extrasToShow = [];
        let remainingCount = unassignedAgents.length;
        EXTRA_GAUDIS.forEach(extra => {
            const hasAgents = (currentAssignments[extra.id] || []).length > 0;
            const shouldShowNew = allBasePlanned && remainingCount > 0 && extrasToShow.length === 0;
            if (hasAgents || shouldShowNew) {
                extrasToShow.push(extra);
                if (!hasAgents) remainingCount--;
            }
        });

        const gaudiPairs = [
            ['GAUDI_110', 'GAUDI_111'],
            ['GAUDI_120', 'GAUDI_121'],
            ['GAUDI_130', 'GAUDI_131'],
            ['GAUDI_140', 'GAUDI_141']
        ];

        const interleavedGaudi = [];
        gaudiPairs.forEach(([mainId, extraId]) => {
            const main = BASE_SERVICES.find(s => s.id === mainId);
            if (main) interleavedGaudi.push(main);
            const extra = extrasToShow.find(s => s.id === extraId);
            if (extra) interleavedGaudi.push(extra);
        });

        const gaudiOrdres = BASE_SERVICES.filter(s => s.id === 'GAUDI_ORDRES');
        const paisas = BASE_SERVICES.filter(s => s.id === '2010' || s.id === '2011');
        const patrolsAll = [...interleavedGaudi, ...gaudiOrdres, ...currentCustom, ...paisas];
        const activePatrols = patrolsAll.filter(s => s.isManual || isServiceActive(s.id));

        if (activePatrols.length > 0) {
            body += `PATRULLES:\n`;
            activePatrols.forEach(s => {
                const assigns = currentAssignments[s.id] || [];
                const names = assigns.map(t => {
                    const a = fullAgents.find(ag => String(ag.tip) === t) || { nom: manualAgentsMap[t] || t };
                    return `${t} (${a.nom})`;
                });
                body += `• ${s.name}: ${names.length > 0 ? names.join(', ') : 'Sense assignar'}\n`;
            });
            body += `\n`;
        }

        // 3. ESTÀTICS
        const staticsBase = BASE_SERVICES.filter(s => !s.id.startsWith('GAUDI_') && s.id !== '2010' && s.id !== '2011');
        const activeStatics = staticsBase.filter(s => isServiceActive(s.id));

        if (activeStatics.length > 0) {
            body += `SERVEIS ESTÀTICS:\n`;
            activeStatics.forEach(s => {
                const respTips = currentAssignments[`${s.id}_RESP`] || [];
                const respNames = respTips.map(t => {
                    const a = fullAgents.find(ag => String(ag.tip) === t) || { nom: manualAgentsMap[t] || t };
                    return `${t} (${a.nom})`;
                });
                const assigns = currentAssignments[s.id] || [];
                const names = assigns.map(t => {
                    const a = fullAgents.find(ag => String(ag.tip) === t) || { nom: manualAgentsMap[t] || t };
                    return `${t} (${a.nom})`;
                });
                body += `• ${s.name}: ${names.length > 0 ? names.join(', ') : 'Sense assignar'}${respNames.length > 0 ? ` | RESP: ${respNames.join(', ')}` : ''}\n`;
            });
            body += `\n`;
        }

        const subject = `QUADRANT ESC ${activeGrup} - ${selectedDate.toLocaleDateString()}`;
        const url = `mailto:${recipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        Linking.canOpenURL(url).then(async (supported) => {
            if (supported) {
                // Publicar la planificació per a que els usuaris la vegin
                setPublishedAssignments(prev => {
                    const newState = { ...prev, [dateKey]: assignments[dateKey] || {} };
                    savePublishedAssignments(activeGrup, newState);
                    return newState;
                });

                const sent = await handlePublishAlert();
                Linking.openURL(url);
                Alert.alert(
                    "Enviat i Publicat",
                    sent ? "La planificació s'ha enviat i publicat. S'ha enviat una alerta a tots els usuaris."
                        : "La planificació s'ha enviat i els canvis s'han publicat."
                );
            } else {
                Alert.alert("Error", "No s'ha pogut obrir l'aplicació de correu.");
            }
        });
    };

    const isServiceActive = (serviceId) => {
        const dayStatus = serviceStatus[dateKey] || {};
        return dayStatus[serviceId] !== false;
    };


    const renderServiceCard = (service) => {
        if (!service) return null;
        const isActive = isServiceActive(service.id);

        // En modo usuario, si el servicio no está activo, no mostramos nada
        if (!isAdmin && !isActive && !service.isManual) return null;
        const qualifiedAgents = availableAgents.filter(a => {
            if (!a.funcions) return false;
            const isMando = a.categoria === "SERGENT" || a.categoria === "CAPORAL";
            if (service.id.startsWith('GAUDI') && isMando) return false;
            if ((service.id === '2010' || service.id === '2011') && isMando) return false;
            if (a.funcions[service.id]) return true;
            if (service.id.startsWith('GAUDI') && (a.funcions['GAUDI'] || a.funcions['GAUDI_ORDRES'])) return true;
            if ((service.id === '2010' || service.id === '2011') && a.funcions['PAISA']) return true;
            return false;
        });
        const assignedList = currentAssignments[service.id] || [];

        return (
            <View
                key={service.id}
                onLayout={(e) => { layoutMap.current[service.id] = e.nativeEvent.layout.y; }}
                style={[styles.serviceCard, { borderLeftColor: service.color }, !isActive && { opacity: 0.5 }]}
            >
                <View style={styles.patrolHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: 'transparent' }]}>
                        {typeof service.icon === 'string' ? (
                            <Text style={{ fontSize: 24 }}>{service.icon}</Text>
                        ) : (
                            <Image source={service.icon} style={{ width: '100%', height: '100%', borderRadius: 27 }} resizeMode="cover" />
                        )}
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity
                                    disabled={!service.isManual || !isAdmin}
                                    onPress={() => handleRenameManualService(service.id, service.name)}
                                >
                                    <Text adjustsFontSizeToFit={true} numberOfLines={1} style={[styles.patrolName, { color: service.color }]}>{service.name}</Text>
                                </TouchableOpacity>
                                {!isActive && <Text style={{ fontSize: 10, color: '#DC3545', fontWeight: 'bold', marginLeft: 8 }}>(DESACTIVAT)</Text>}
                            </View>

                            {/* Config Badge aligned to the right, next to the name */}
                            {['2010', '2011', 'OAC', 'IAD', 'ACD', 'SEGURETAT', 'INCIDENCIES', 'OAC_BARCELONETA'].includes(service.id) && (
                                <TouchableOpacity
                                    style={styles.configSticker}
                                    onPress={isAdmin ? () => handleConfigureService(service.id, service.name) : undefined}
                                    activeOpacity={isAdmin ? 0.7 : 1}
                                >
                                    <Text style={styles.configStickerText}>⚙️ {serviceConfigs[service.id] || 0}</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Line below for Available agents and Assign button */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ fontSize: 12, color: '#888' }}>
                                {qualifiedAgents.length} agents disponibles
                            </Text>

                            <View style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                                {isAdmin && (
                                    <TouchableOpacity
                                        style={[styles.addBtn, { backgroundColor: service.color, minWidth: 90, marginBottom: 8 }]}
                                        onPress={() => {
                                            setAssignTarget({ id: service.id, name: service.name, isService: true });
                                            setShowAssignModal(true);
                                        }}
                                    >
                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>ASSIGNAR</Text>
                                    </TouchableOpacity>
                                )}
                                {(service.id === 'OAC_BARCELONETA' || service.id === '2010' || service.id === '2011' || service.id === 'GAUDI_ORDRES') && isAdmin && (
                                    <TouchableOpacity onPress={() => toggleServiceStatus(service.id)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ width: 17, height: 17, borderWidth: 2, borderColor: service.color, borderRadius: 4, backgroundColor: isActive ? service.color : 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 4 }}>
                                            {isActive && <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>✓</Text>}
                                        </View>
                                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#666' }}>ACTIU</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {service.isManual && isAdmin && (
                            <TouchableOpacity
                                onPress={() => handleDeleteManualService(service.id)}
                                style={{ alignSelf: 'flex-end', marginTop: 5 }}
                            >
                                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2' }}>
                                    <Text style={{ color: '#D32F2F', fontSize: 16, fontWeight: 'bold', marginTop: -2 }}>-</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
                <View style={styles.assignmentArea}>
                    {service.needsResponsible && (
                        <View style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                                <Text style={styles.roleLabel}>RESPONSABLE</Text>
                                {isAdmin && (
                                    <TouchableOpacity onPress={() => { setAssignTarget({ id: `${service.id}_RESP`, name: `Responsable de ${service.name}`, isService: true, onlyCapAgent: true }); setShowAssignModal(true); }}>
                                        <Text style={{ fontSize: 10, color: service.color, fontWeight: 'bold' }}>+ ASSIGNAR</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {(currentAssignments[`${service.id}_RESP`] || []).map(t => {
                                const a = fullAgents.find(ag => String(ag.tip) === t);
                                return (
                                    <View key={t} style={[styles.assignedAgentRow, { backgroundColor: service.color + '10' }]}>
                                        <Text style={[styles.agentTip, { fontSize: 14 }]}>{t} — {a?.nom || 'Agent'}</Text>
                                        {isAdmin && <TouchableOpacity onPress={() => handleRemoveAssignment(`${service.id}_RESP`, t)}><Text style={{ color: '#DC3545', fontWeight: 'bold' }}>X</Text></TouchableOpacity>}
                                    </View>
                                );
                            })}
                            {(!currentAssignments[`${service.id}_RESP`] || currentAssignments[`${service.id}_RESP`].length === 0) && <Text style={{ fontSize: 12, color: '#AAA', fontStyle: 'italic', marginLeft: 5 }}>Sense responsable</Text>}
                        </View>
                    )}
                    <Text style={[styles.roleLabel, { marginTop: 5 }]}>AGENTS</Text>
                    {assignedList.map(t => {
                        const officialAgent = fullAgents.find(ag => String(ag.tip) === t);
                        const manualAgentName = manualAgentsMap[t];
                        const isManualEntry = !officialAgent && manualAgentName;

                        return (
                            <View key={t} style={[styles.assignedAgentRow, isManualEntry && { backgroundColor: '#F8F9FA', borderStyle: 'dotted', borderWidth: 1, borderColor: '#DDD' }]}>
                                <Text style={[styles.agentTip, isManualEntry && { color: '#666' }]}>
                                    {t} — {officialAgent?.nom || manualAgentName || 'Agent'}
                                    {isManualEntry && <Text style={{ fontSize: 9, color: '#999', fontWeight: 'normal' }}> (Manual)</Text>}
                                </Text>
                                {isAdmin && <TouchableOpacity onPress={() => handleRemoveAssignment(service.id, t)}><Text style={{ color: '#DC3545', fontWeight: 'bold' }}>X</Text></TouchableOpacity>}
                            </View>
                        );
                    })}
                    {assignedList.length === 0 && (
                        <TouchableOpacity
                            activeOpacity={isAdmin ? 0.7 : 1}
                            onPress={isAdmin ? () => handleManualEntryPress(service.id) : undefined}
                            style={styles.emptyAssignment}
                        >
                            <Text style={styles.emptyText}>Cap agent adjudicat encara</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {qualifiedAgents.length > 0 && (
                    <View style={styles.qualifiedList}>
                        <Text style={styles.qualifiedTitle}>Aptes per al servei:</Text>
                        <View style={styles.chipContainer}>
                            {qualifiedAgents.map(a => <View key={a.tip} style={styles.agentChip}><Text style={styles.agentChipText}>{a.tip}</Text></View>)}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} adjustsFontSizeToFit={true} style={styles.title}>PLANIFICACIÓ</Text>
                    <View style={styles.escamotHeaderRow}>
                        <Text style={styles.escamotInfo}>ESCAMOT:</Text>
                        {isAdmin ? (
                            <Text style={[styles.escamotInfo, { marginLeft: 10, color: COLORS.PRIMARY, fontSize: 22, marginTop: -2 }]}>
                                {activeGrup}
                            </Text>
                        ) : (
                            <Text style={[styles.escamotInfo, { marginLeft: 10, color: COLORS.PRIMARY, fontSize: 22, marginTop: -2 }]}>
                                {activeGrup}
                            </Text>
                        )}
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <TouchableOpacity style={styles.presenceBtn} onPress={() => setShowSelectionModal(true)}>
                        <Text style={styles.presenceBtnText}>{isAdmin ? "👥 PERSONAL" : "👥 PLANTILLA"}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {isAdmin && (
                <View style={{ flexDirection: 'row', paddingHorizontal: 0, marginBottom: 15, justifyContent: 'space-between' }}>
                    <TouchableOpacity
                        style={[styles.presenceBtn, { backgroundColor: '#FFF0F0', flex: 1, marginRight: 4, alignItems: 'center', paddingHorizontal: 1, height: 40, justifyContent: 'center' }]}
                        onPress={handleResetPlanning}
                    >
                        <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[styles.presenceBtnText, { color: '#DC3545', fontSize: 10, fontWeight: '900' }]}>🗑️ ESBORRA</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.presenceBtn, { backgroundColor: '#E8F5E9', flex: 1, marginRight: 4, alignItems: 'center', paddingHorizontal: 1, height: 40, justifyContent: 'center' }]}
                        onPress={handleAutoPlan}
                    >
                        <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[styles.presenceBtnText, { color: '#2E7D32', fontSize: 10, fontWeight: '900' }]}>🪄 AUTO</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.presenceBtn, { backgroundColor: '#FFF9C4', flex: 1, marginRight: 4, alignItems: 'center', paddingHorizontal: 1, height: 40, justifyContent: 'center' }]}
                        onPress={async () => {
                            setPublishedAssignments(prev => {
                                const newState = { ...prev, [dateKey]: assignments[dateKey] || {} };
                                savePublishedAssignments(activeGrup, newState);
                                return newState;
                            });
                            const sent = await handlePublishAlert();
                            Alert.alert(
                                "Guardat i Publicat",
                                sent ? "La planificació s'ha guardat i publicat. S'ha enviat una alerta a tots els usuaris."
                                    : "La planificació s'ha guardat i los canvis s'han publicat."
                            );
                        }}
                    >
                        <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[styles.presenceBtnText, { color: '#FBC02D', fontSize: 10, fontWeight: '900' }]}>💾 GUARDA</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.presenceBtn, { backgroundColor: '#E3F2FD', flex: 1, alignItems: 'center', paddingHorizontal: 1, height: 40, justifyContent: 'center' }]}
                        onPress={handleSendEmail}
                    >
                        <Text numberOfLines={1} adjustsFontSizeToFit={true} style={[styles.presenceBtnText, { color: COLORS.PRIMARY, fontSize: 10, fontWeight: '900' }]}>✈️ ENVIA</Text>
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                ref={scrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.daySelector}
                contentContainerStyle={{ paddingHorizontal: 20 }}
                data={availableDays}
                keyExtractor={(item, idx) => idx.toString()}
                getItemLayout={(data, index) => (
                    { length: 100, offset: 100 * index, index }
                )}
                onScrollToIndexFailed={info => {
                    const wait = new Promise(resolve => setTimeout(resolve, 500));
                    wait.then(() => {
                        scrollRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
                    });
                }}
                renderItem={({ item }) => {
                    const isSelected = item.date.toDateString() === selectedDate.toDateString();
                    return (
                        <TouchableOpacity onPress={() => handleDateSelect(item.date)} style={[styles.dayBtn, isSelected && styles.dayBtnActive, { width: 90 }]}>
                            <Text style={[styles.dayBtnText, isSelected && styles.dayBtnTextActive]}>{item.label}</Text>
                            <View style={[styles.turnBadge, { backgroundColor: COLORS[item.turn === 'M' ? 'MATI' : item.turn === 'T' ? 'TARDA' : 'NIT'] }]}>
                                <Text style={styles.turnBadgeText}>{item.turn}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            <ScrollView
                ref={verticalScrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 40 }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                    <View style={{
                        backgroundColor: COLORS.PRIMARY,
                        paddingHorizontal: 15,
                        paddingVertical: 8,
                        borderRadius: 12,
                        minWidth: '40%',
                        elevation: 4,
                        shadowColor: COLORS.PRIMARY,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.1)'
                    }}>
                        <Text style={[styles.currentPlanTitle, { textAlign: 'left' }]}>TORN: {activeTurnLabel}</Text>
                    </View>
                    {!isAdmin && (!publishedAssignments[dateKey] || Object.keys(publishedAssignments[dateKey]).length === 0) && (
                        <View style={{ marginLeft: 15 }}>
                            <View style={{ backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#FFCDD2' }}>
                                <Text style={{ color: '#D32F2F', fontSize: 11, fontWeight: '900' }}>⚠️ PENDENT</Text>
                            </View>
                        </View>
                    )}
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={[styles.subtitle, { marginBottom: 0 }]}>INDICATIUS</Text>
                    {isAdmin && (
                        <TouchableOpacity onPress={handleAddManualService} style={{ padding: 5 }}>
                            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DDD' }}>
                                <Text style={{ color: '#333', fontSize: 20, fontWeight: 'bold', marginTop: -2 }}>+</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {mandos.length > 0 && (
                    <View style={{ marginBottom: 25 }}>
                        {mandos.map((mando, idx) => {
                            const mandoId = `MANDO_${mando.tip}`;
                            const assignedBinomi = currentAssignments[mandoId] || [];
                            return (
                                <View
                                    key={`mando-${idx}`}
                                    onLayout={(e) => { layoutMap.current[mandoId] = e.nativeEvent.layout.y; }}
                                    style={styles.patrolCard}
                                >
                                    <View style={styles.patrolHeader}>
                                        <View style={[styles.iconCircle, { backgroundColor: 'transparent' }]}>
                                            {typeof mando.icon === 'string' ? (
                                                <Text style={{ fontSize: 24 }}>{mando.icon}</Text>
                                            ) : (
                                                <Image source={mando.icon} style={{ width: '100%', height: '100%', borderRadius: 27 }} resizeMode="cover" />
                                            )}
                                        </View>
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text adjustsFontSizeToFit={true} numberOfLines={1} style={styles.patrolName}>{mando.indicativo}</Text>
                                            </View>

                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                                <Text style={{ fontSize: 13, color: '#666', fontWeight: '500' }}>{mando.categoria}</Text>

                                                {isAdmin && (
                                                    <TouchableOpacity
                                                        style={[styles.addBtn, { backgroundColor: COLORS.PRIMARY, minWidth: 90 }]}
                                                        onPress={() => {
                                                            setAssignTarget({ id: mandoId, name: `Binomi per a ${mando.indicativo}` });
                                                            setShowAssignModal(true);
                                                        }}
                                                    >
                                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>ASSIGNAR</Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                    <View style={styles.agentsContainer}>
                                        <View style={styles.agentBox}>
                                            <Text style={styles.agentTip}>{mando.tip} — {mando.nom}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.assignmentArea, { marginTop: 10 }]}>
                                        {assignedBinomi.length > 0 ? (
                                            assignedBinomi.map(t => {
                                                const officialAgent = fullAgents.find(ag => String(ag.tip) === t);
                                                const manualAgentName = manualAgentsMap[t];
                                                const isManualEntry = !officialAgent && manualAgentName;

                                                return (
                                                    <View key={t} style={[styles.assignedAgentRow, isManualEntry && { backgroundColor: '#F8F9FA', borderStyle: 'dotted', borderWidth: 1, borderColor: '#DDD' }]}>
                                                        <Text style={[styles.agentTip, isManualEntry && { color: '#666' }]}>
                                                            {t} — {officialAgent?.nom || manualAgentName || 'Agent'}
                                                            {isManualEntry && <Text style={{ fontSize: 9, color: '#999', fontWeight: 'normal' }}> (Manual)</Text>}
                                                        </Text>
                                                        {isAdmin && (
                                                            <TouchableOpacity onPress={() => handleRemoveAssignment(mandoId, t)}>
                                                                <Text style={{ color: '#DC3545', fontWeight: 'bold' }}>X</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                );
                                            })
                                        ) : (
                                            <View style={styles.emptyAssignment}>
                                                <Text style={styles.emptyText}>Sense binomi adjudicat</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}



                {(() => {
                    const currentCustom = customServices[dateKey] || [];
                    const mandoTips = mandos.map(m => String(m.tip).trim());
                    const unassignedAgents = availableAgents.filter(a =>
                        !allAssignedTips.includes(String(a.tip).trim()) &&
                        !mandoTips.includes(String(a.tip).trim())
                    );

                    // Solo mostramos extras si los servicios base (estáticos + patrullas 0 + PAISÀ) están cubiertos
                    const baseMandatoryIds = ['GAUDI_110', 'GAUDI_111', 'GAUDI_120', 'GAUDI_121', 'GAUDI_130', 'GAUDI_131', 'GAUDI_140', 'GAUDI_141', 'GAUDI_ORDRES', '2010', '2011', 'OAC', 'IAD', 'ACD', 'SEGURETAT'];
                    const allBasePlanned = baseMandatoryIds.every(id => {
                        if (!isServiceActive(id)) return true; // Si está desactivado, no cuenta
                        const hasDotacio = (currentAssignments[id] || []).length > 0;
                        const hasResp = (currentAssignments[`${id}_RESP`] || []).length > 0;
                        return hasDotacio || hasResp;
                    });

                    let extrasToShow = [];
                    let remainingCount = unassignedAgents.length;

                    EXTRA_GAUDIS.forEach(extra => {
                        const hasAgents = (currentAssignments[extra.id] || []).length > 0;
                        const shouldShowNew = allBasePlanned && remainingCount > 0 && extrasToShow.length === 0;
                        if (hasAgents || shouldShowNew) {
                            extrasToShow.push(extra);
                            if (!hasAgents) remainingCount--;
                        }
                    });

                    const allServices = [...BASE_SERVICES, ...extrasToShow, ...currentCustom];


                    // Definir l'ordre per al renderitzat
                    // Definir l'ordre per al renderitzat (Intercalat 110, 111, 120, 121...)
                    const gaudiPairs = [
                        ['GAUDI_110', 'GAUDI_111'],
                        ['GAUDI_120', 'GAUDI_121'],
                        ['GAUDI_130', 'GAUDI_131'],
                        ['GAUDI_140', 'GAUDI_141']
                    ];

                    const interleavedGaudi = [];
                    gaudiPairs.forEach(([mainId, extraId]) => {
                        const main = BASE_SERVICES.find(s => s.id === mainId);
                        if (main) interleavedGaudi.push(main);

                        const extra = extrasToShow.find(s => s.id === extraId);
                        if (extra) interleavedGaudi.push(extra);
                    });

                    const gaudiOrdres = BASE_SERVICES.filter(s => s.id === 'GAUDI_ORDRES');
                    const paisas = BASE_SERVICES.filter(s => s.id === '2010' || s.id === '2011');
                    const staticsBase = BASE_SERVICES.filter(s => !s.id.startsWith('GAUDI_') && s.id !== '2010' && s.id !== '2011');

                    // Llista total de "Patrulles" amb l'ordre intercalat
                    // Els indicatius manuals es posen just després de GAUDI ORDRES (o GAUDI 141)
                    const patrolsAll = [...interleavedGaudi, ...gaudiOrdres, ...currentCustom, ...paisas];

                    // Separar actius i inactius per seccions
                    // Els manuals es consideren actius per defecte
                    const activePatrols = patrolsAll.filter(s => s.isManual || isServiceActive(s.id));
                    const activeStatics = staticsBase.filter(s => isServiceActive(s.id));
                    const allInactive = [...patrolsAll, ...staticsBase].filter(s => !isServiceActive(s.id));

                    return (
                        <>
                            {activePatrols.map(renderServiceCard)}

                            {activeStatics.length > 0 && (
                                <>
                                    <Text style={styles.subtitle}>SERVEIS ESTÀTICS</Text>
                                    {activeStatics.map(renderServiceCard)}
                                </>
                            )}

                            {(() => {
                                const pendingAgents = availableAgents.filter(a =>
                                    !allAssignedTips.includes(String(a.tip).trim()) &&
                                    !mandos.find(m => String(m.tip).trim() === String(a.tip).trim())
                                );

                                if (!isAdmin || pendingAgents.length === 0) return null;

                                return (
                                    <TouchableOpacity
                                        onPress={() => setShowPendingModal(true)}
                                        style={{
                                            padding: 15,
                                            backgroundColor: '#FFCDD2',
                                            borderRadius: 12,
                                            marginVertical: 10,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderWidth: 1,
                                            borderColor: '#EF9A9A'
                                        }}
                                    >
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#D32F2F' }}>
                                            ⚠️ {pendingAgents.length} AGENTS PENDENTS DE PLANIFICAR
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })()}

                            {isAdmin && allInactive.length > 0 && (
                                <>
                                    <Text style={styles.subtitle}>SERVEIS INACTIUS</Text>
                                    {allInactive.map(renderServiceCard)}
                                </>
                            )}
                        </>
                    );
                })()}

                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal visible={showSelectionModal} animationType="slide" onRequestClose={() => setShowSelectionModal(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                    <View style={{ padding: 25, flex: 1 }}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Disponibilitat</Text>
                                <Text style={[styles.adminTag, { color: isAdmin ? '#28A745' : '#DC3545' }]}>{isAdmin ? "● MODO ADMINISTRADOR ACTIU" : "● MODO CONSULTA"}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowSelectionModal(false)} style={{ padding: 10 }}><Text style={styles.closeBtn}>FET</Text></TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>{selectedDate.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                        {isAdmin && (
                            <View style={styles.modalActionRow}>
                                <TouchableOpacity onPress={async () => { const newState = { ...absentAgents, [dateKey]: [] }; setAbsentAgents(newState); await savePresence(activeGrup, newState); }} style={styles.modalActionBtn}><Text style={styles.modalActionText}>Seleccionar tots</Text></TouchableOpacity>
                                <TouchableOpacity onPress={async () => { const newState = { ...absentAgents, [dateKey]: fullAgents.map(a => String(a.tip).trim()) }; setAbsentAgents(newState); await savePresence(activeGrup, newState); }} style={styles.modalActionBtn}><Text style={styles.modalActionText}>Desmarcar tots</Text></TouchableOpacity>
                            </View>
                        )}
                        <ScrollView style={{ marginTop: 10 }}>
                            {fullAgents.sort((a, b) => { const order = { "SERGENT": 1, "CAPORAL": 2, "AGENT": 3 }; return (order[a.categoria] || 4) - (order[b.categoria] || 4); }).map(agent => {
                                const isPresent = !(absentAgents[dateKey] || []).includes(String(agent.tip).trim());
                                return (
                                    <TouchableOpacity key={agent.tip} activeOpacity={0.6} onPress={() => toggleAgentPresence(agent.tip)} style={[styles.agentSelectRow, isPresent ? styles.rowSelected : styles.rowUnselected]}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={[styles.agentSelectTip, { color: isPresent ? COLORS.PRIMARY : '#999' }]}>{agent.tip}</Text>
                                                <View style={[styles.catBadge, { backgroundColor: isPresent ? COLORS.PRIMARY + '20' : '#EEE' }]}><Text style={{ fontSize: 9, fontWeight: 'bold', color: isPresent ? COLORS.PRIMARY : '#666' }}>{agent.categoria}</Text></View>
                                            </View>
                                            <Text style={[styles.agentSelectNom, { color: isPresent ? '#444' : '#AAA' }]}>{agent.nom}</Text>
                                            {(() => {
                                                // For night shifts, check JUDICI from next day
                                                let judiciDateKey = dateKey;
                                                if (activeTurnKey === 'N') {
                                                    const nextDay = new Date(selectedDate);
                                                    nextDay.setDate(nextDay.getDate() + 1);
                                                    judiciDateKey = nextDay.toDateString();
                                                }

                                                const dayNote = calendarNotes[dateKey]?.[agent.tip];
                                                const judiciNote = calendarNotes[judiciDateKey]?.[agent.tip];

                                                if (!dayNote && !judiciNote) return null;

                                                let statuses = [...(dayNote?.statuses || (dayNote?.status ? [dayNote.status] : []))];
                                                const hasNextDayJudici = judiciNote?.statuses?.includes("JUDICI") || judiciNote?.status === "JUDICI";

                                                // En turno de noche, ignoramos juicios de hoy (ya pasados) y mostramos los de mañana
                                                if (activeTurnKey === 'N') {
                                                    statuses = statuses.filter(s => s !== "JUDICI");
                                                    if (hasNextDayJudici) statuses.push("JUDICI");
                                                }

                                                if (statuses.length === 0) return null;

                                                return (
                                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                                                        {statuses.filter(st => st !== "PERLLONGAMENT").map((st, i) => {
                                                            let displayText = st;

                                                            if (st === "JUDICI") {
                                                                // For night shifts, use next day's judici data
                                                                const isNight = activeTurnKey === 'N';
                                                                const sourceNote = (isNight ? judiciNote : dayNote);
                                                                const judiciData = sourceNote?.judici;

                                                                if (judiciData && judiciData.hora) {
                                                                    const targetDate = new Date(judiciDateKey);
                                                                    const dStr = targetDate.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                                    displayText = `${st} ${judiciData.hora} DIA ${dStr}`;
                                                                }
                                                            }

                                                            if (st === "PERMÍS" || st === "AP" || st === "ALTRES") {
                                                                const stKey = st.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                                                const specificData = dayNote[stKey];

                                                                if (specificData) {
                                                                    if (!specificData.fullDay && specificData.partial) {
                                                                        displayText = `${st} ${specificData.partial.start} - ${specificData.partial.end}`;
                                                                    }
                                                                } else if (dayNote.partial && !dayNote.fullDay && dayNote.partial.start) {
                                                                    // Fallback per dades globals o antigues
                                                                    displayText = `${st} ${dayNote.partial.start} - ${dayNote.partial.end}`;
                                                                }
                                                            }

                                                            return (
                                                                <View key={i} style={[styles.catBadge, {
                                                                    marginLeft: 0,
                                                                    marginRight: 5,
                                                                    marginBottom: 2,
                                                                    backgroundColor: STATUS_COLORS[st]?.bg || '#EEE',
                                                                    paddingVertical: 3,
                                                                    paddingHorizontal: 6
                                                                }]}>
                                                                    <Text style={{ fontSize: 10, fontWeight: '900', color: STATUS_COLORS[st]?.text || '#666' }}>{displayText}</Text>
                                                                </View>
                                                            );
                                                        })}
                                                    </View>
                                                );
                                            })()}
                                        </View>
                                        <View style={[styles.statusIndicator, { backgroundColor: isPresent ? '#28A745' : '#DC3545' }]}><Text style={styles.statusText}>{isPresent ? "DISPONIBLE" : "NO DISPONIBLE"}</Text></View>
                                    </TouchableOpacity>
                                );
                            })}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Modal>
            <Modal visible={showAssignModal} animationType="slide" transparent>
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { height: '70%', borderRadius: 20 }]}>
                        <View style={styles.modalHeader}>
                            <View><Text style={styles.modalTitle}>ASSIGNAR</Text><Text style={{ color: COLORS.PRIMARY, fontWeight: 'bold' }}>{assignTarget?.name}</Text></View>
                            <TouchableOpacity onPress={() => setShowAssignModal(false)} style={{ padding: 10 }}><Text style={styles.closeBtn}>TANCAR</Text></TouchableOpacity>
                        </View>
                        <ScrollView style={{ marginTop: 15 }}>
                            {availableAgents.filter(a => {
                                const isMando = a.categoria === "SERGENT" || a.categoria === "CAPORAL";

                                // 1. Los mandos (Sgt/Cabo) no pueden ir en indicativos de patrulla GAUDI (110, 141, etc)
                                if (assignTarget?.id.startsWith('GAUDI') && isMando) return false;

                                // 2. Para responsables de IAD/OAC, solo Cabos y Agentes (No Sargentos)
                                if (assignTarget?.onlyCapAgent) return a.categoria !== "SERGENT";

                                // 3. Para el binomio de un Mando, permitimos a todos (luego isBusy filtrará a los que ya tienen indicativo)
                                if (String(assignTarget?.id).startsWith("MANDO_")) return true;

                                return true;
                            }).map(agent => {
                                const tipStr = String(agent.tip).trim();
                                const isCabo = agent.categoria === "CAPORAL";
                                const isTargetingResp = String(assignTarget?.id).endsWith('_RESP');

                                // Un agente está ocupado si ya está en cualquier asignación (ya tiene un servicio asignado)
                                // Para los cabos, si los estamos asignando a Responsable, ignoramos si tienen indicativo Gaudi por defecto
                                const hasMandoInList = mandos.some(m => String(m.tip).trim() === tipStr);
                                const isBusy = allAssignedTips.includes(tipStr) || (hasMandoInList && !isTargetingResp);

                                // Normalitzem el ID per treure el sufix _RESP si existeix i comprovar la funció base
                                const baseId = String(assignTarget?.id).replace('_RESP', '');

                                const isQualified = assignTarget?.isService ? (
                                    // Cas especial Responsables (OAC/IAD)
                                    isTargetingResp ? (isCabo || (agent.funcions && agent.funcions[baseId === 'OAC' ? 'OAC_RESP' : baseId])) :

                                        // Resta de casos
                                        ((agent.funcions && agent.funcions[baseId]) ||
                                            (baseId.startsWith('GAUDI') && agent.funcions && (agent.funcions['GAUDI'] || agent.funcions['GAUDI_ORDRES'])) ||
                                            ((baseId === '2010' || baseId === '2011') && agent.funcions && agent.funcions['PAISA']))
                                ) : true;

                                return (
                                    <TouchableOpacity
                                        key={agent.tip}
                                        style={[styles.agentSelectRow, (isBusy || !isQualified) && { opacity: 0.5 }]}
                                        onPress={() => (!isBusy && isQualified) && handleAssignAgent(assignTarget.id, agent.tip)}
                                        disabled={isBusy || !isQualified}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.agentSelectTip, isBusy && { color: '#999' }]}>{agent.tip} {isBusy ? "📌" : ""}</Text>
                                            <Text style={[styles.agentSelectNom, isBusy && { color: '#999' }]}>{agent.nom}</Text>
                                            {!isQualified && !isBusy && <Text style={{ fontSize: 9, color: '#DC3545' }}>No apte per aquesta funció</Text>}
                                            {isBusy && <Text style={{ fontSize: 9, color: '#666' }}>Ja planificat en un altre servei</Text>}
                                        </View>
                                        <View style={[styles.statusIndicator, { backgroundColor: isBusy ? '#EEE' : COLORS.PRIMARY }]}>
                                            <Text style={[styles.statusText, { color: isBusy ? '#888' : 'white' }]}>{isBusy ? "OCUPAT" : "TRIAR"}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            {/* Modal de Password Administrador */}
            <Modal visible={passwordPromptVisible} transparent animationType="fade">
                <View style={styles.passwordModalOverlay}>
                    <View style={styles.passwordModalContent}>
                        <Text style={styles.modalTitle}>ACCÉS RESTRINGIT</Text>
                        <Text style={styles.passwordModalSubTitle}>Introdueix la contrasenya d'administrador per continuar amb aquesta acció destructiva.</Text>
                        <TextInput
                            style={styles.passwordInput}
                            placeholder="••••••"
                            secureTextEntry
                            value={passwordInput}
                            onChangeText={setPasswordInput}
                            autoFocus
                        />
                        <View style={styles.modalButtonsRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: '#EEE' }]}
                                onPress={() => setPasswordPromptVisible(false)}
                            >
                                <Text style={{ color: '#666', fontWeight: 'bold' }}>CANCEL·LAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: COLORS.PRIMARY }]}
                                onPress={confirmPassword}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>CONFIRMAR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal visible={configModalVisible} animationType="fade" transparent={true} onRequestClose={() => setConfigModalVisible(false)}>
                <View style={styles.centeredModalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.configModalContent}>
                        <Text style={styles.configModalTitle}>Configurar AGENTS</Text>
                        <Text style={styles.configModalSubtitle}>{configTarget?.name}</Text>

                        {(configTarget?.id === 'OAC' || configTarget?.id === 'IAD') && (
                            <View style={{ backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, marginBottom: 15 }}>
                                <Text style={{ fontSize: 12, color: '#1976D2', fontWeight: '800' }}>
                                    💡 El responsable es compta a part. Aquí indiques quants agents EXTRA vols.
                                </Text>
                            </View>
                        )}

                        <Text style={styles.configLabel}>Nº d'agents obligatoris:</Text>
                        <TextInput
                            style={styles.configInput}
                            value={configValue}
                            onChangeText={setConfigValue}
                            keyboardType="numeric"
                            autoFocus={true}
                            selectTextOnFocus={true}
                        />
                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={[styles.modalActionBtn, { flex: 1, marginRight: 10 }]} onPress={() => setConfigModalVisible(false)}>
                                <Text style={[styles.modalActionText, { textAlign: 'center' }]}>CANCEL·LAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalActionBtn, { flex: 1, backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY }]} onPress={saveServiceConfig}>
                                <Text style={[styles.modalActionText, { color: 'white', textAlign: 'center' }]}>GUARDAR</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            <Modal visible={showPendingModal} animationType="slide" onRequestClose={() => setShowPendingModal(false)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
                    <View style={{ padding: 25, flex: 1 }}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Pendents</Text>
                                <Text style={[styles.adminTag, { color: '#D32F2F' }]}>● AGENTS SENSE SERVEI ASSIGNAT</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowPendingModal(false)} style={{ padding: 10 }}><Text style={styles.closeBtn}>FET</Text></TouchableOpacity>
                        </View>
                        <Text style={styles.modalSubtitle}>{selectedDate.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>

                        <ScrollView style={{ marginTop: 15 }}>
                            {availableAgents.filter(a =>
                                !allAssignedTips.includes(String(a.tip).trim()) &&
                                !mandos.find(m => String(m.tip).trim() === String(a.tip).trim())
                            ).sort((a, b) => {
                                const order = { "SERGENT": 1, "CAPORAL": 2, "AGENT": 3 };
                                return (order[a.categoria] || 4) - (order[b.categoria] || 4);
                            }).map(agent => (
                                <TouchableOpacity
                                    key={agent.tip}
                                    activeOpacity={0.7}
                                    onPress={() => handlePendingAgentPress(agent)}
                                    style={[styles.agentSelectRow, { backgroundColor: '#FFF5F5', borderColor: '#FFCDD2', borderWidth: 1 }]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={[styles.agentSelectTip, { color: '#D32F2F' }]}>{agent.tip}</Text>
                                            <View style={[styles.catBadge, { backgroundColor: '#FFCDD2' }]}><Text style={{ fontSize: 9, fontWeight: 'bold', color: '#D32F2F' }}>{agent.categoria}</Text></View>
                                        </View>
                                        <Text style={[styles.agentSelectNom, { color: '#444' }]}>{agent.nom}</Text>
                                    </View>
                                    <View style={[styles.statusIndicator, { backgroundColor: '#D32F2F' }]}><Text style={styles.statusText}>ASSIGNAR</Text></View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </SafeAreaView>
            </Modal>

            <Modal visible={!!pendingAgentAction} animationType="fade" transparent onRequestClose={() => setPendingAgentAction(null)}>
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContent, { height: '70%', borderRadius: 25 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>ASSIGNAR</Text>
                                <Text style={{ color: COLORS.PRIMARY, fontWeight: 'bold' }}>{pendingAgentAction?.tip} — {pendingAgentAction?.nom}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setPendingAgentAction(null)} style={{ padding: 10 }}><Text style={styles.closeBtn}>TANCAR</Text></TouchableOpacity>
                        </View>
                        <ScrollView style={{ marginTop: 15 }}>
                            {pendingPossibleServices.map(s => (
                                <TouchableOpacity
                                    key={s.id}
                                    onPress={() => {
                                        handleAssignAgent(s.id, pendingAgentAction.tip);
                                        setPendingAgentAction(null);
                                    }}
                                    style={[styles.agentSelectRow, { backgroundColor: '#F0F7FF', borderColor: COLORS.PRIMARY + '30', borderWidth: 1 }]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.PRIMARY }}>{s.name}</Text>
                                    </View>
                                    <View style={[styles.statusIndicator, { backgroundColor: COLORS.PRIMARY }]}><Text style={styles.statusText}>TRIAR</Text></View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            {/* Modal de Renombre Manual */}
            <Modal visible={renameModalVisible} transparent animationType="fade">
                <View style={styles.passwordModalOverlay}>
                    <View style={styles.configModalContent}>
                        <Text style={styles.configModalTitle}>CANVIAR NOM</Text>
                        <Text style={styles.configModalSubtitle}>Edita el nom de l'indicatiu manual</Text>
                        <TextInput
                            style={styles.configInput}
                            value={renameValue}
                            onChangeText={setRenameValue}
                            autoFocus
                        />
                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={[styles.modalActionBtn, { flex: 1, marginRight: 10 }]} onPress={() => setRenameModalVisible(false)}>
                                <Text style={[styles.modalActionText, { textAlign: 'center' }]}>CANCEL·LAR</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalActionBtn, { flex: 1, backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY }]} onPress={saveRename}>
                                <Text style={[styles.modalActionText, { color: 'white', textAlign: 'center' }]}>GUARDAR</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal de Entrada Manual de Agentes */}
            <Modal visible={manualEntryModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: 'auto', paddingBottom: 40 }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>ENTRADA MANUAL</Text>
                                <Text style={styles.modalSubtitle}>Escriu el TIP i Nom dels agents</Text>
                            </View>
                            <TouchableOpacity onPress={() => setManualEntryModalVisible(false)} style={{ padding: 10 }}>
                                <Text style={styles.closeBtn}>X</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ marginTop: 20 }}>
                            <Text style={styles.roleLabel}>AGENT 1</Text>
                            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                                <TextInput
                                    placeholder="TIP"
                                    style={[styles.configInput, { flex: 0.3, marginBottom: 0, marginRight: 10 }]}
                                    value={manualEntryData.tip1}
                                    onChangeText={(v) => setManualEntryData(p => ({ ...p, tip1: v }))}
                                />
                                <TextInput
                                    placeholder="Nom i Cognoms"
                                    style={[styles.configInput, { flex: 0.7, marginBottom: 0 }]}
                                    value={manualEntryData.nom1}
                                    onChangeText={(v) => setManualEntryData(p => ({ ...p, nom1: v }))}
                                />
                            </View>

                            <Text style={styles.roleLabel}>AGENT 2</Text>
                            <View style={{ flexDirection: 'row', marginBottom: 25 }}>
                                <TextInput
                                    placeholder="TIP"
                                    style={[styles.configInput, { flex: 0.3, marginBottom: 0, marginRight: 10 }]}
                                    value={manualEntryData.tip2}
                                    onChangeText={(v) => setManualEntryData(p => ({ ...p, tip2: v }))}
                                />
                                <TextInput
                                    placeholder="Nom i Cognoms"
                                    style={[styles.configInput, { flex: 0.7, marginBottom: 0 }]}
                                    value={manualEntryData.nom2}
                                    onChangeText={(v) => setManualEntryData(p => ({ ...p, nom2: v }))}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.modalActionBtn, { backgroundColor: COLORS.PRIMARY, height: 50, justifyContent: 'center', borderColor: COLORS.PRIMARY }]}
                                onPress={saveManualEntry}
                            >
                                <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>GUARDAR AGENTS</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: "#F5F7FA", paddingTop: 60 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    title: { fontSize: 28, fontWeight: "900", color: COLORS.PRIMARY },
    escamotHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    escamotInfo: { fontSize: 18, color: '#333', fontWeight: '900', letterSpacing: 0.5 },
    pickerHeaderWrapper: {
        height: 34,
        width: 80,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        justifyContent: 'center',
        marginLeft: 8,
        borderWidth: 2,
        borderColor: COLORS.PRIMARY,
        overflow: 'hidden',
    },
    pickerLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    pickerLabelText: {
        fontSize: 14,
        fontWeight: '900',
        color: COLORS.PRIMARY
    },
    pickerArrow: {
        fontSize: 10,
        color: COLORS.PRIMARY,
        marginLeft: 4
    },
    invisiblePicker: {
        width: 150,
        height: 40,
        opacity: 0,
        backgroundColor: 'transparent'
    },
    presenceBtn: { backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    presenceBtnText: { color: COLORS.PRIMARY, fontWeight: 'bold', fontSize: 11 },
    daySelector: { marginBottom: 20, maxHeight: 85 },
    dayBtn: { backgroundColor: 'white', padding: 12, borderRadius: 12, marginRight: 10, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, minWidth: 90, height: 70, justifyContent: 'center' },
    dayBtnActive: { backgroundColor: COLORS.PRIMARY, elevation: 4 },
    dayBtnText: { fontSize: 11, fontWeight: 'bold', color: '#666', marginBottom: 5 },
    dayBtnTextActive: { color: 'white' },
    turnBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    turnBadgeText: { color: 'white', fontSize: 10, fontWeight: '800' },
    currentPlanTitle: { fontSize: 14, fontWeight: '900', color: 'white', letterSpacing: 0.5 },
    subtitle: { fontSize: 18, fontWeight: '800', marginBottom: 15, color: '#333', letterSpacing: 0.5 },
    patrolCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    serviceCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 5, elevation: 2 },
    patrolHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    iconCircle: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
    patrolName: { fontSize: 16, fontWeight: 'bold', color: COLORS.PRIMARY },
    agentsContainer: { marginTop: 5 },
    agentBox: { flex: 1 },
    roleLabel: { fontSize: 10, color: '#999', fontWeight: '800', marginBottom: 2, textTransform: 'uppercase' },
    agentTip: { fontSize: 16, fontWeight: '600', color: '#333' },
    addBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    assignmentArea: { marginTop: 5, marginBottom: 10 },
    emptyAssignment: { backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#DDD', alignItems: 'center' },
    emptyText: { color: '#AAA', fontSize: 13, fontStyle: 'italic' },
    qualifiedList: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10 },
    qualifiedTitle: { fontSize: 11, fontWeight: 'bold', color: '#888', marginBottom: 6, textTransform: 'uppercase' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    agentChip: { backgroundColor: '#EEE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
    agentChipText: { fontSize: 12, fontWeight: '600', color: '#555' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, height: '80%', padding: 25 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.PRIMARY },
    modalSubtitle: { fontSize: 14, color: '#666', textTransform: 'capitalize' },
    adminTag: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
    closeBtn: { color: COLORS.PRIMARY, fontWeight: '900', fontSize: 16 },
    modalActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, marginBottom: 5 },
    modalActionBtn: { backgroundColor: '#F0F0F0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
    modalActionText: { fontSize: 13, fontWeight: 'bold', color: COLORS.PRIMARY },
    agentSelectRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', alignItems: 'center', borderRadius: 12, marginBottom: 8 },
    catBadge: { marginLeft: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    rowSelected: { backgroundColor: '#F0F7FF', borderColor: COLORS.PRIMARY + '30', borderWidth: 1 },
    rowUnselected: { backgroundColor: '#FDFDFD', opacity: 0.8 },
    agentSelectTip: { fontSize: 17, fontWeight: '800' },
    agentSelectNom: { fontSize: 13 },
    statusIndicator: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
    assignedAgentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F7FF', padding: 10, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: COLORS.PRIMARY + '20' },
    configSticker: { backgroundColor: '#F0F0F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
    configStickerText: { fontSize: 11, fontWeight: 'bold', color: '#555' },
    centeredModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    configModalContent: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '100%', maxWidth: 340, elevation: 5 },
    configModalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.PRIMARY, marginBottom: 5 },
    configModalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
    configLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 10 },
    configInput: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 15, fontSize: 18, fontWeight: 'bold', color: COLORS.PRIMARY, textAlign: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#DDD' },

    passwordModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    passwordModalContent: { backgroundColor: 'white', borderRadius: 24, padding: 25, width: '100%', maxWidth: 400, elevation: 10 },
    passwordModalSubTitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    passwordInput: { borderWidth: 2, borderColor: '#EEE', borderRadius: 12, padding: 15, fontSize: 20, textAlign: 'center', marginBottom: 20, backgroundColor: '#F9F9FB' },
    modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    modalBtn: { flex: 0.48, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
});
