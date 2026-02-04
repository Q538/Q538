import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Animated } from "react-native";
import { getAgents, saveAgents as dbSaveAgents, getSelectedGrup, saveSelectedGrup, getAgentDetail, getAlerts } from "../services/database";
import { COLORS } from "../theme/colors";

// Pantallas
import AgentsScreen from "./AgentsScreen";
import CalendarScreen from "./CalendarScreen";
import QuadrantScreen from "./QuadrantScreen";
import StatsScreen from "./StatsScreen";
import ConfigScreen from "./ConfigScreen";
import SupportScreen from "./SupportScreen";
import AlertsScreen from "./AlertsScreen";

const STORAGE_KEY = "@agents_list";

export default function MainContainer({ session, setSession }) {
    const [activeTab, setActiveTab] = useState("Agents");
    const [agents, setAgents] = useState([]);
    const [selectedGrup, setSelectedGrup] = useState(session?.grup || 4);
    const [isAddingAgent, setIsAddingAgent] = useState(false);
    const [initialDate, setInitialDate] = useState(null);
    const [initialEditTip, setInitialEditTip] = useState(null);
    const [initialStatus, setInitialStatus] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const pulseAnim = useState(new Animated.Value(1))[0];
    const isAdmin = session?.perfil === "ADMIN";
    const userTip = String(session?.user?.tip || "");

    // Cargar agentes al inicio y cuando cambie el grupo
    useEffect(() => {
        const loadInitialData = async () => {
            const savedGrup = await getSelectedGrup();
            if (savedGrup) setSelectedGrup(savedGrup);
        };
        loadInitialData();

        // Funció per comprovar alertes
        const checkAlerts = async () => {
            const allAlerts = await getAlerts();
            const unread = allAlerts.filter(a => !a.read && (isAdmin || String(a.tip) === userTip));
            setUnreadCount(unread.length);
        };

        // Comprovar inicialment
        checkAlerts();

        // Interval de seguretat cada 30 segons per si hi ha canvis externs
        const interval = setInterval(checkAlerts, 30000);
        return () => clearInterval(interval);
    }, [isAdmin, userTip]);

    const refreshAlertsCount = async () => {
        const allAlerts = await getAlerts();
        const unread = allAlerts.filter(a => !a.read && (isAdmin || String(a.tip) === userTip));
        setUnreadCount(unread.length);
    };

    // Animació de pols per a la campana d'alertes
    useEffect(() => {
        if (unreadCount > 0) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        useNativeDriver: true
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true
                    })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [unreadCount]);

    useEffect(() => {
        const loadAgentsData = async () => {
            const currentAgents = await getAgents(selectedGrup);

            // Enriquir la llista amb els noms i dades de les fitxes individuals
            const enriched = await Promise.all(
                currentAgents.map(async (agent) => {
                    const detail = await getAgentDetail(agent.tip);
                    if (detail) {
                        return {
                            ...agent,
                            ...detail,
                            nom: detail.nom || agent.nom // Prioritat al nom de la fitxa
                        };
                    }
                    return agent;
                })
            );

            setAgents(enriched);
        };
        loadAgentsData();
    }, [selectedGrup]);

    const saveAgents = async (newAgents) => {
        setAgents(newAgents);
        await dbSaveAgents(selectedGrup, newAgents);
    };

    const updateSelectedGrup = async (g) => {
        setSelectedGrup(g);
        await saveSelectedGrup(g);
    };

    const handleAddAgent = () => {
        setIsAddingAgent(true);
        setActiveTab("Agents");
    };

    const renderContent = () => {
        switch (activeTab) {
            case "Agents":
                return (
                    <AgentsScreen
                        session={session}
                        setSession={setSession}
                        agents={agents}
                        setAgents={saveAgents}
                        isAddingAgent={isAddingAgent}
                        setIsAddingAgent={setIsAddingAgent}
                        activeGrupProp={selectedGrup}
                    />
                );
            case "Calendari":
                return (
                    <CalendarScreen
                        session={session}
                        selectedGrup={selectedGrup}
                        updateSelectedGrup={updateSelectedGrup}
                        initialDate={initialDate}
                        initialEditTip={initialEditTip}
                        initialStatus={initialStatus}
                        clearInitialDate={() => {
                            setInitialDate(null);
                            setInitialEditTip(null);
                            setInitialStatus(null);
                        }}
                    />
                );
            case "Quadrant":
                return <QuadrantScreen agents={agents} session={session} activeGrupProp={selectedGrup} updateSelectedGrup={updateSelectedGrup} />;
            case "Estadística":
                return <StatsScreen session={session} agents={agents} selectedGrup={selectedGrup} />;
            case "Suport":
                return (
                    <SupportScreen
                        session={session}
                        activeGrupProp={selectedGrup}
                        updateSelectedGrup={updateSelectedGrup}
                        onEditNote={(date, tip, status) => {
                            setInitialDate(date);
                            setInitialEditTip(tip);
                            setInitialStatus(status);
                            setActiveTab("Calendari");
                        }}
                    />
                );
            case "Alertes":
                return (
                    <AlertsScreen
                        session={session}
                        onRefreshAlerts={refreshAlertsCount}
                        onNavigateToDate={(date) => {
                            setInitialDate(date);
                            setActiveTab("Calendari");
                        }}
                    />
                );
            case "Configuració":
                return isAdmin ? <ConfigScreen setSession={setSession} /> : null;
            default:
                return (
                    <AgentsScreen
                        session={session}
                        setSession={setSession}
                        agents={agents}
                        setAgents={saveAgents}
                        isAddingAgent={isAddingAgent}
                        setIsAddingAgent={setIsAddingAgent}
                        activeGrupProp={selectedGrup}
                    />
                );
        }
    };

    const TabItem = ({ name, label, icon }) => {
        const isAlertTab = name === "Alertes";
        const hasAlerts = isAlertTab && unreadCount > 0;

        return (
            <TouchableOpacity
                style={styles.tabItem}
                onPress={() => setActiveTab(name)}
                activeOpacity={0.7}
            >
                <View>
                    <Text style={[styles.tabIcon, { color: activeTab === name ? COLORS.PRIMARY : "#999" }]}>
                        {icon}
                    </Text>
                    {hasAlerts && (
                        <Animated.View
                            style={[
                                styles.alertBadge,
                                { transform: [{ scale: pulseAnim }] }
                            ]}
                        />
                    )}
                </View>
                <Text style={[styles.tabLabel, { color: activeTab === name ? COLORS.PRIMARY : "#999" }]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7FA" }}>
            <View style={{ flex: 1 }}>
                {renderContent()}
            </View>

            {activeTab === "Agents" && isAdmin && (
                <TouchableOpacity
                    style={[styles.floatingPlus, { left: '50%', marginLeft: -32.5 }]}
                    onPress={handleAddAgent}
                >
                    <Text style={styles.plusText}>+</Text>
                </TouchableOpacity>
            )}

            <View style={styles.tabBar}>
                <TabItem name="Agents" label={selectedGrup === 4 ? "Escamot" : "Agents"} icon="👥" />
                <TabItem name="Calendari" label="Calendari" icon="📅" />
                <TabItem name="Quadrant" label="Quadrant" icon="📊" />
                {isAdmin && <TabItem name="Estadística" label="Anàlisi" icon="📈" />}
                <TabItem name="Suport" label="Suport" icon="📝" />
                <TabItem name="Alertes" label="Alertes" icon="🔔" />
                {isAdmin && <TabItem name="Configuració" label="Config" icon="⚙️" />}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        flexDirection: "row",
        height: 95, // Más alto para compensar los botones del sistema
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#EEE",
        justifyContent: "space-around",
        alignItems: "center",
        paddingBottom: 30, // Espacio de seguridad para no tocar los botones del móvil
        zIndex: 1000,
        elevation: 10
    },
    tabItem: {
        flex: 1,
        height: '100%',
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 10,
    },
    tabIcon: {
        fontSize: 30, // Más grandes
        marginBottom: 1
    },
    tabLabel: {
        fontSize: 7.5, // Más pequeña para que quepan en una línea
        fontWeight: "900",
        textTransform: 'uppercase',
        textAlign: 'center',
        width: '100%'
    },
    alertBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF5252', // Roig vibrant
        borderWidth: 1.5,
        borderColor: 'white',
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
    },
    floatingPlus: {
        position: 'absolute',
        bottom: 110, // Elevado para quedar por encima de la zona de seguridad de 95
        backgroundColor: '#DDD',
        width: 65,
        height: 65,
        borderRadius: 32.5,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 10 // Encima de todo
    },
    plusText: {
        fontSize: 50,
        fontWeight: 'bold',
        color: '#1B5E20', // Verd fosc
        marginTop: -4
    }
});
