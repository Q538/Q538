import AsyncStorage from "@react-native-async-storage/async-storage";
import { sendLocalNotification } from "./notificationService";

/**
 * DATABASE SERVICE (Current implementation: LocalStorage)
 * 
 * To migrate to a real cloud DB (Firebase/Supabase):
 * 1. Initialize your cloud SDK here
 * 2. Replace the AsyncStorage calls with cloud provider methods
 * 3. Ensure you handle auth/permissions if needed
 */

const KEYS = {
    AGENTS_LIST: (grup) => (grup === 4 || !grup) ? "@agents_list_v2" : `@agents_list_esc${grup}_v2`,
    AGENT_DETAIL: (tip) => `agent_${tip}`,
    SELECTED_GRUP: "@selected_grup_v1",
    PRESENCE: (grup) => (grup === 4 || !grup) ? "@presence_v3" : `@presence_esc${grup}_v3`,
    ASSIGNMENTS: (grup) => (grup === 4 || !grup) ? "@assignments_v1" : `@assignments_esc${grup}_v1`,
    SERVICE_STATUS: (grup) => (grup === 4 || !grup) ? "@service_status_v1" : `@service_status_esc${grup}_v1`,
    SERVICE_CONFIGS: (grup) => (grup === 4 || !grup) ? "@service_configs_v1" : `@service_configs_esc${grup}_v1`,
    ROTATION_HISTORY: (grup) => (grup === 4 || !grup) ? "@rotation_history_v2" : `@rotation_history_esc${grup}_v2`,
    CUSTOM_SERVICES: (grup) => (grup === 4 || !grup) ? "@custom_services_v1" : `@custom_services_esc${grup}_v1`,
    MANUAL_AGENTS: (grup) => (grup === 4 || !grup) ? "@manual_agents_v1" : `@manual_agents_esc${grup}_v1`,
    EMAIL_RECIPIENTS: "@email_recipients_v1",
    EMAIL_RECIPIENTS_PERLL: "@email_recipients_perll_v1",
    CALENDAR_NOTES: "@calendar_notes_v1",
    ALERTS: "@alerts_v1",
    PUBLISHED_ASSIGNMENTS: (grup) => (grup === 4 || !grup) ? "@published_assignments_v1" : `@published_assignments_esc${grup}_v1`,
    AUTO_PERL_RULES: "@auto_perl_rules_v1",
};

// ... existing code ...

export const getAutoPerlRules = async () => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.AUTO_PERL_RULES);
        if (!saved) {
            const defaults = [
                { id: "gaudi100", label: "GAUDI 100", motiu: "Novetats Cap de Torn", anticipament: 30, perllongament: 0 },
                { id: "iad_resp", label: "RESP. INSTRUCCIÓ (CAPORAL)", motiu: "Novetats Instrucció", anticipament: 30, perllongament: 0 },
                { id: "oac_resp_cap", label: "RESP. OAC (CAPORAL)", motiu: "Novetats OAC", anticipament: 30, perllongament: 0 },
                { id: "oac_resp_agt", label: "RESP. OAC (AGENT)", motiu: "Gestions OAC", anticipament: 30, perllongament: 60 },
                { id: "incidencies", label: "INCIDÈNCIES", motiu: "Novetats Incidencies", anticipament: 30, perllongament: 0 },
                { id: "custodia", label: "CUSTÒDIA (TIP BAIX)", motiu: "Novetats Custòdia", anticipament: 30, perllongament: 0 }
            ];
            await AsyncStorage.setItem(KEYS.AUTO_PERL_RULES, JSON.stringify(defaults));
            return defaults;
        }
        return JSON.parse(saved);
    } catch (e) {
        return [];
    }
};

export const saveAutoPerlRules = async (rules) => {
    try {
        await AsyncStorage.setItem(KEYS.AUTO_PERL_RULES, JSON.stringify(rules));
    } catch (e) { }
};

// --- AGENTS ---

export const getAgents = async (grup) => {
    try {
        const key = KEYS.AGENTS_LIST(grup);
        const saved = await AsyncStorage.getItem(key);
        if (!saved) {
            // Default data for Escamot 4 if empty
            if (grup === 4) {
                const defaults = [
                    // MANDO
                    { tip: "14767", nom: "Enric Llauradó Pajares", categoria: "SERGENT", createdAt: 1 },
                    // CAPORALS (Orden de prelación)
                    { tip: "11818", nom: "Cristobal Girona Marimon", categoria: "CAPORAL", createdAt: 2 },
                    { tip: "19538", nom: "Jonatan Priego Garcia", categoria: "CAPORAL", createdAt: 3 },
                    { tip: "14706", nom: "Pedro Jose Ibañez Molero", categoria: "CAPORAL", createdAt: 4 },
                    { tip: "14710", nom: "Antonio Iglesias Martin", categoria: "CAPORAL", createdAt: 5 },
                    // AGENTS
                    { tip: "12832", nom: "Javier Bernabe Gomez", categoria: "AGENT", createdAt: 6 },
                    { tip: "13274", nom: "Pablo Guirado Mesa", categoria: "AGENT", createdAt: 7 },
                    { tip: "16990", nom: "Jorge Buendia Sorribas", categoria: "AGENT", createdAt: 8 },
                    { tip: "18988", nom: "David Callejon Peinado", categoria: "AGENT", createdAt: 9 },
                    { tip: "21101", nom: "Sergio Aranda Barranco", categoria: "AGENT", createdAt: 10 },
                    { tip: "21105", nom: "Jesús Asensio Martinez", categoria: "AGENT", createdAt: 11 },
                    { tip: "21185", nom: "Roque Cordoba Baena", categoria: "AGENT", createdAt: 12 },
                    { tip: "21265", nom: "Jonatan Garcia Espejo", categoria: "AGENT", createdAt: 13 },
                    { tip: "21483", nom: "Cristian Resa Morillas", categoria: "AGENT", createdAt: 14 },
                    { tip: "21563", nom: "Alexandra Ursan Ursan", categoria: "AGENT", createdAt: 15 },
                    { tip: "21586", nom: "Gerard Vives Cutura", categoria: "AGENT", createdAt: 16 },
                    { tip: "21804", nom: "David Elgstrom Ludevid", categoria: "AGENT", createdAt: 17 },
                    { tip: "21906", nom: "Natividad Gomis Mas", categoria: "AGENT", createdAt: 18 },
                    { tip: "22231", nom: "Albert Sendros Plana", categoria: "AGENT", createdAt: 19 },
                    { tip: "22384", nom: "Laura Benitez Martos", categoria: "AGENT", createdAt: 20 },
                    { tip: "22420", nom: "David Camarero Sanchez", categoria: "AGENT", createdAt: 21 },
                    { tip: "22472", nom: "Eric Coma I Garcia", categoria: "AGENT", createdAt: 22 },
                    { tip: "22569", nom: "Alex Gago Cuenca", categoria: "AGENT", createdAt: 23 },
                    { tip: "22645", nom: "Oscar Hernandez Ballesteros", categoria: "AGENT", createdAt: 24 },
                    { tip: "22669", nom: "Eric Juan Cuartero", categoria: "AGENT", createdAt: 25 },
                    { tip: "22828", nom: "Daniel Perez Amoros", categoria: "AGENT", createdAt: 26 },
                    { tip: "22843", nom: "Eric Periago Moreno", categoria: "AGENT", createdAt: 27 },
                    { tip: "22902", nom: "Anna Rodon Ceprian", categoria: "AGENT", createdAt: 28 },
                    { tip: "22930", nom: "Raul Ruiz Balboa", categoria: "AGENT", createdAt: 29 },
                    { tip: "22972", nom: "Jessica Sola Ortiz", categoria: "AGENT", createdAt: 30 },
                    { tip: "23208", nom: "Africa Gonzalez Calafi", categoria: "AGENT", createdAt: 31 },
                    { tip: "23219", nom: "Pol Hernandez Vallejo", categoria: "AGENT", createdAt: 32 },
                    { tip: "23220", nom: "Sergio Herrador Marchante", categoria: "AGENT", createdAt: 33 },
                    { tip: "23427", nom: "Lidia Rubio Martinez", categoria: "AGENT", createdAt: 34 },
                    { tip: "23511", nom: "Meritxell Xapelli Vivas", categoria: "AGENT", createdAt: 35 },
                    { tip: "23612", nom: "Sara Blanch Perez", categoria: "AGENT", createdAt: 36 },
                    { tip: "23743", nom: "Raul Diaz Martinez", categoria: "AGENT", createdAt: 37 },
                    { tip: "23896", nom: "Miguel Angel Iglesias Moratalla", categoria: "AGENT", createdAt: 38 },
                    { tip: "24150", nom: "Alberto Prieto Garcia", categoria: "AGENT", createdAt: 39 },
                    { tip: "24191", nom: "Anaïs Roca Gonzalez", categoria: "AGENT", createdAt: 40 },
                    { tip: "24315", nom: "Irene Tortosa Macanaz", categoria: "AGENT", createdAt: 41 },
                    { tip: "24484", nom: "Ruth Cabaño Aymar", categoria: "AGENT", createdAt: 42 },
                    { tip: "24524", nom: "Alexis Cardizales Maldonado", categoria: "AGENT", createdAt: 43 },
                    { tip: "24714", nom: "Marc Forn Palet", categoria: "AGENT", createdAt: 44 },
                    { tip: "24824", nom: "Marc Hernandez Gonzalez", categoria: "AGENT", createdAt: 45 },
                    { tip: "24927", nom: "Javier Martinez Exposito", categoria: "AGENT", createdAt: 46 },
                    { tip: "25112", nom: "Sandra Rodriguez Gomez", categoria: "AGENT", createdAt: 47 },
                    { tip: "25213", nom: "Judit Torns Paya", categoria: "AGENT", createdAt: 48 },
                    { tip: "25435", nom: "Cristoffer Adrian Cespedes Mendez", categoria: "AGENT", createdAt: 49 }
                ];
                await AsyncStorage.setItem(key, JSON.stringify(defaults));
                return defaults;
            }
            return [];
        }
        return JSON.parse(saved);
    } catch (e) {
        console.error("Error loading agents", e);
        return [];
    }
};

export const saveAgents = async (grup, agents) => {
    try {
        const key = KEYS.AGENTS_LIST(grup);
        await AsyncStorage.setItem(key, JSON.stringify(agents));
    } catch (e) {
        console.error("Error saving agents list", e);
    }
};

export const getAgentDetail = async (tip) => {
    try {
        const key = KEYS.AGENT_DETAIL(tip);
        const saved = await AsyncStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.error("Error loading agent detail", e);
        return null;
    }
};

export const saveAgentDetail = async (tip, detail) => {
    try {
        const key = KEYS.AGENT_DETAIL(tip);
        await AsyncStorage.setItem(key, JSON.stringify(detail));
    } catch (e) {
        console.error("Error saving agent detail", e);
    }
};

export const deleteAgentDetail = async (tip) => {
    try {
        const key = KEYS.AGENT_DETAIL(tip);
        await AsyncStorage.removeItem(key);
    } catch (e) {
        console.error("Error deleting agent detail", e);
    }
};

// --- SETTINGS / GRUPS ---

export const getSelectedGrup = async () => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.SELECTED_GRUP);
        return saved ? parseInt(saved) : null;
    } catch (e) {
        return null;
    }
};

export const saveSelectedGrup = async (grup) => {
    try {
        await AsyncStorage.setItem(KEYS.SELECTED_GRUP, String(grup));
    } catch (e) { }
};

// --- QUADRANT / PLANNING ---

export const getPresence = async (grup) => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.PRESENCE(grup));
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

export const savePresence = async (grup, presence) => {
    try {
        await AsyncStorage.setItem(KEYS.PRESENCE(grup), JSON.stringify(presence));
    } catch (e) { }
};

export const getAssignments = async (grup) => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.ASSIGNMENTS(grup));
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

export const saveAssignments = async (grup, assignments) => {
    try {
        await AsyncStorage.setItem(KEYS.ASSIGNMENTS(grup), JSON.stringify(assignments));
    } catch (e) { }
};

export const getPublishedAssignments = async (grup) => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.PUBLISHED_ASSIGNMENTS(grup));
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

export const savePublishedAssignments = async (grup, assignments) => {
    try {
        await AsyncStorage.setItem(KEYS.PUBLISHED_ASSIGNMENTS(grup), JSON.stringify(assignments));
    } catch (e) { }
};

export const getServiceStatus = async (grup) => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.SERVICE_STATUS(grup));
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

export const saveServiceStatus = async (grup, status) => {
    try {
        await AsyncStorage.setItem(KEYS.SERVICE_STATUS(grup), JSON.stringify(status));
    } catch (e) { }
};

export const getServiceConfigs = async (grup) => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.SERVICE_CONFIGS(grup));
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

export const saveServiceConfigs = async (grup, configs) => {
    try {
        await AsyncStorage.setItem(KEYS.SERVICE_CONFIGS(grup), JSON.stringify(configs));
    } catch (e) { }
};

export const getRotationHistory = async (grup) => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.ROTATION_HISTORY(grup));
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

export const saveRotationHistory = async (grup, history) => {
    try {
        await AsyncStorage.setItem(KEYS.ROTATION_HISTORY(grup), JSON.stringify(history));
    } catch (e) { }
};

export const getCustomServices = async (grup) => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.CUSTOM_SERVICES(grup));
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

export const saveCustomServices = async (grup, services) => {
    try {
        await AsyncStorage.setItem(KEYS.CUSTOM_SERVICES(grup), JSON.stringify(services));
    } catch (e) { }
};

export const getManualAgents = async (grup) => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.MANUAL_AGENTS(grup));
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

export const saveManualAgents = async (grup, agentsMap) => {
    try {
        await AsyncStorage.setItem(KEYS.MANUAL_AGENTS(grup), JSON.stringify(agentsMap));
    } catch (e) { }
};
export const getEmailRecipients = async () => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.EMAIL_RECIPIENTS);
        return saved || "";
    } catch (e) {
        return "";
    }
};

export const saveEmailRecipients = async (emails) => {
    try {
        await AsyncStorage.setItem(KEYS.EMAIL_RECIPIENTS, emails);
    } catch (e) { }
};

export const getEmailRecipientsPerll = async () => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.EMAIL_RECIPIENTS_PERLL);
        return saved || "";
    } catch (e) {
        return "";
    }
};

export const saveEmailRecipientsPerll = async (emails) => {
    try {
        await AsyncStorage.setItem(KEYS.EMAIL_RECIPIENTS_PERLL, emails);
    } catch (e) { }
};

export const getCalendarNotes = async () => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.CALENDAR_NOTES);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
};

export const saveCalendarNotes = async (notes) => {
    try {
        await AsyncStorage.setItem(KEYS.CALENDAR_NOTES, JSON.stringify(notes));
    } catch (e) { }
};

export const getAlerts = async () => {
    try {
        const saved = await AsyncStorage.getItem(KEYS.ALERTS);
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
};

export const saveAlerts = async (alerts) => {
    try {
        await AsyncStorage.setItem(KEYS.ALERTS, JSON.stringify(alerts));
    } catch (e) { }
};

export const addAlert = async (tip, message, dateObj = null) => {
    try {
        const alerts = await getAlerts();
        const newAlert = {
            id: Date.now().toString(),
            tip: String(tip),
            message,
            date: new Date().toISOString(),
            targetDate: dateObj ? dateObj.toISOString() : null, // Meta-data for navigation
            read: false
        };
        alerts.unshift(newAlert);
        // Keep only last 50 alerts
        await saveAlerts(alerts.slice(0, 50));

        // Enviar notificació local (visible amb mòbil bloquejat)
        const title = message.includes("planificació") ? "PLANIFICACIÓ" :
            message.includes("JUDICI") ? "JUDICI" :
                message.includes("PERLLONGAMENT") ? "PERLLONGAMENT" : "ALERTA";

        await sendLocalNotification(title, message);
    } catch (e) { }
};
