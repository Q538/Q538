import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { COLORS } from "../theme/colors";
import { getAlerts, saveAlerts } from "../services/database";

export default function AlertsScreen({ session, onNavigateToDate, onRefreshAlerts }) {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const userTip = String(session?.user?.tip || "");
    const isAdmin = session?.perfil === "ADMIN";

    const loadAlerts = async () => {
        setLoading(true);
        const allAlerts = await getAlerts();
        // Si no es admin, mostrar les seves i les globals ('ALL')
        const filtered = isAdmin ? allAlerts : allAlerts.filter(a => String(a.tip) === userTip || a.tip === "ALL");
        setAlerts(filtered);
        setLoading(false);
    };

    // Recargar alertas cuando la pantalla gane el foco
    useEffect(() => {
        loadAlerts();
    }, []);

    const handleAlertPress = async (alert) => {
        // 1. Marcar como leída
        const allAlerts = await getAlerts();
        const updated = allAlerts.map(a => a.id === alert.id ? { ...a, read: true } : a);
        await saveAlerts(updated);

        const filtered = isAdmin ? updated : updated.filter(a => String(a.tip) === userTip || a.tip === "ALL");
        setAlerts(filtered);

        // 2. Avisar al MainContainer que refresque el contador del puntet lluminós
        if (onRefreshAlerts) onRefreshAlerts();

        // 3. Navegar si tiene fecha objetivo
        if (alert.targetDate && onNavigateToDate) {
            onNavigateToDate(new Date(alert.targetDate));
        }
    };

    const clearAlerts = async () => {
        const allAlerts = await getAlerts();
        let updated;
        if (isAdmin) {
            updated = [];
        } else {
            updated = allAlerts.filter(a => String(a.tip) !== userTip && a.tip !== "ALL");
        }
        await saveAlerts(updated);
        setAlerts([]);
        if (onRefreshAlerts) onRefreshAlerts();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Alertes</Text>
                {alerts.length > 0 && (
                    <TouchableOpacity onPress={clearAlerts} style={styles.clearBtn}>
                        <Text style={styles.clearBtnText}>Netejar</Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                </View>
            ) : alerts.length === 0 ? (
                <View style={styles.content}>
                    <Text style={styles.icon}>🔔</Text>
                    <Text style={styles.emptyText}>No hi ha alertes pendents</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.list}>
                    {alerts.map((alert) => (
                        <TouchableOpacity
                            key={alert.id}
                            style={[styles.alertCard, !alert.read && styles.unreadCard]}
                            onPress={() => handleAlertPress(alert)}
                        >
                            <View style={styles.alertHeader}>
                                <View style={styles.alertTitleContainer}>
                                    <View style={[
                                        styles.statusDot,
                                        {
                                            backgroundColor: alert.message.includes("PERLLONGAMENT") ? "#424242" :
                                                alert.message.includes("planificació") ? COLORS.PRIMARY : "#1565C0"
                                        }
                                    ]} />
                                    <Text style={styles.alertTitle}>
                                        {alert.message.includes("PERLLONGAMENT") ? "PERLLONGAMENT" :
                                            alert.message.includes("planificació") ? "PLANIFICACIÓ" : "JUDICI"}
                                    </Text>
                                </View>
                                <Text style={styles.alertDate}>
                                    {new Date(alert.date).toLocaleDateString()}
                                </Text>
                            </View>
                            <Text style={styles.alertMessage} numberOfLines={1} ellipsizeMode="tail">{alert.message}</Text>
                            {isAdmin && (
                                <Text style={styles.adminTip}>Per al TIP: {alert.tip}</Text>
                            )}
                            {!alert.read && <View style={styles.unreadIconDot} />}
                            {alert.targetDate && (
                                <View style={styles.navIndicator}>
                                    <Text style={styles.navText}>Toca per veure el dia ➔</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F7FA",
    },
    header: {
        padding: 24,
        paddingTop: 60,
        backgroundColor: "white",
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: "#EEE",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: COLORS.PRIMARY,
    },
    clearBtn: {
        padding: 8,
    },
    clearBtnText: {
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    icon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        color: "#666",
        textAlign: "center",
    },
    list: {
        padding: 16,
    },
    alertCard: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        position: 'relative',
    },
    unreadCard: {
        borderLeftWidth: 4,
        borderLeftColor: COLORS.PRIMARY,
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    alertTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    alertTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#444',
        letterSpacing: 0.5,
    },
    alertDate: {
        fontSize: 12,
        color: '#999',
    },
    alertMessage: {
        fontSize: 15,
        color: '#444',
        lineHeight: 20,
    },
    adminTip: {
        fontSize: 11,
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
        marginTop: 8,
    },
    unreadIconDot: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 8, height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.PRIMARY,
    },
    navIndicator: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 0.5,
        borderTopColor: '#EEE',
        alignItems: 'flex-end',
    },
    navText: {
        fontSize: 11,
        color: COLORS.PRIMARY,
        fontWeight: 'bold',
    }
});
