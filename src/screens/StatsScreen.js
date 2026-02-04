import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, FlatList } from "react-native";
import { useState, useEffect } from "react";
import { getAssignments } from "../services/database";
import { PieChart, BarChart } from "react-native-chart-kit";
import { COLORS } from "../theme/colors";
import { Picker } from "@react-native-picker/picker";

const SCREEN_WIDTH = Dimensions.get("window").width;

const STATIC_SERVICES = ['IAD', 'OAC', 'OAC_BARCELONETA', 'ACD', 'INCIDENCIES', 'SEGURETAT'];
const SERVICE_NAMES = {
    'IAD': 'IAD',
    'OAC': 'OAC',
    'OAC_BARCELONETA': 'OAC BCNTA',
    'ACD': 'ACD',
    'INCIDENCIES': 'INCID.',
    'SEGURETAT': 'SEGUR.'
};

const CHART_COLORS = [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#8BC34A', '#F44336'
];

export default function StatsScreen({ agents = [], session, selectedGrup }) {
    const [loading, setLoading] = useState(true);
    const [statsData, setStatsData] = useState({});
    const [globalStats, setGlobalStats] = useState({ total: 0, patrol: 0, static: 0, staticBreakdown: {} });
    const [hasData, setHasData] = useState(false);

    const today = new Date();
    const [selectedRange, setSelectedRange] = useState("MONTH"); // MONTH, QUARTER, SEMI, YEAR
    const [selectedPeriod, setSelectedPeriod] = useState(today.getMonth()); // Mes (0-11), Trimestre (0-3), Semestre (0-1)
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());

    useEffect(() => {
        calculateStats();
    }, [agents, selectedGrup, selectedPeriod, selectedYear, selectedRange]);

    const calculateStats = async () => {
        setLoading(true);
        try {
            const assignments = await getAssignments();

            const stats = {};
            const global = {
                total: 0,
                patrol: 0,
                static: 0,
                staticBreakdown: {}
            };

            // 1. Identificar agentes (Categoría AGENT)
            const onlyAgents = agents.filter(a => {
                const cat = (a.categoria || "").toUpperCase().trim();
                return cat === "AGENT";
            });

            if (onlyAgents.length === 0) {
                setStatsData({});
                setGlobalStats(global);
                setHasData(false);
                setLoading(false);
                return;
            }

            onlyAgents.forEach(agent => {
                const tipStr = String(agent.tip).trim();
                stats[tipStr] = {
                    nom: agent.nom,
                    tip: tipStr,
                    total: 0,
                    patrolTotal: 0,
                    staticTotal: 0,
                    staticBreakdown: {}
                };
            });

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            let foundAny = false;
            Object.keys(assignments).forEach(dateStr => {
                const date = new Date(dateStr);

                // Excluir hoy y futuro (solo dades de torns ja fets)
                if (date >= now) return;

                const year = date.getFullYear();
                const month = date.getMonth();

                if (year !== selectedYear) return;

                let isInRange = false;
                if (selectedRange === "MONTH") {
                    isInRange = month === selectedPeriod;
                } else if (selectedRange === "QUARTER") {
                    // Q1 (0,1,2), Q2 (3,4,5)...
                    isInRange = Math.floor(month / 3) === selectedPeriod;
                } else if (selectedRange === "SEMI") {
                    // S1 (0-5), S2 (6-11)
                    isInRange = (month < 6 ? 0 : 1) === selectedPeriod;
                } else if (selectedRange === "YEAR") {
                    isInRange = true;
                }

                if (!isInRange) return;

                const dayPlan = assignments[dateStr];
                Object.keys(dayPlan).forEach(serviceId => {
                    const assignedTips = dayPlan[serviceId] || [];
                    const baseServiceId = serviceId.replace('_RESP', '');
                    const isStatic = STATIC_SERVICES.includes(baseServiceId);

                    assignedTips.forEach(rawTip => {
                        const tip = String(rawTip).trim();
                        if (stats[tip]) {
                            foundAny = true;
                            stats[tip].total += 1;
                            global.total += 1;

                            if (isStatic) {
                                stats[tip].staticTotal += 1;
                                stats[tip].staticBreakdown[baseServiceId] = (stats[tip].staticBreakdown[baseServiceId] || 0) + 1;

                                global.static += 1;
                                global.staticBreakdown[baseServiceId] = (global.staticBreakdown[baseServiceId] || 0) + 1;
                            } else {
                                stats[tip].patrolTotal += 1;
                                global.patrol += 1;
                            }
                        }
                    });
                });
            });

            setStatsData(stats);
            setGlobalStats(global);
            setHasData(foundAny);
        } catch (error) {
            console.error("Error calculating stats:", error);
        }
        setLoading(false);
    };

    const getRangeLabel = () => {
        if (selectedRange === "MONTH") return months[selectedPeriod];
        if (selectedRange === "QUARTER") return `${selectedPeriod + 1}r Trimestre`;
        if (selectedRange === "SEMI") return `${selectedPeriod + 1}r Semestre`;
        return `Any ${selectedYear}`;
    };

    const renderHeader = () => {
        if (!hasData) return null;

        const globalMainData = [
            { name: "Patrulla", population: globalStats.patrol, color: '#4A90E2', legendFontColor: "#7F7F7F", legendFontSize: 12 },
            { name: "Estàtics", population: globalStats.static, color: '#F5A623', legendFontColor: "#7F7F7F", legendFontSize: 12 }
        ].filter(d => d.population > 0);

        return (
            <View style={styles.globalCard}>
                <Text style={styles.globalTitle}>RESUM {getRangeLabel().toUpperCase()} - ESCAMOT {selectedGrup} (FINALITZATS)</Text>
                <View style={styles.globalStatsRow}>
                    <View style={styles.globalStatItem}>
                        <Text style={styles.globalStatValue}>{globalStats.total}</Text>
                        <Text style={styles.globalStatLabel}>TOTAL SERVEIS</Text>
                    </View>
                    <View style={[styles.globalStatItem, { borderLeftWidth: 1, borderLeftColor: '#EEE' }]}>
                        <Text style={styles.globalStatValue}>{Object.keys(statsData).filter(t => statsData[t].total > 0).length}</Text>
                        <Text style={styles.globalStatLabel}>AGENTS ACTIUS</Text>
                    </View>
                </View>

                <View style={{ alignItems: 'center', marginTop: 10 }}>
                    <PieChart
                        data={globalMainData}
                        width={SCREEN_WIDTH - 60}
                        height={180}
                        chartConfig={chartConfig}
                        accessor={"population"}
                        backgroundColor={"transparent"}
                        paddingLeft={"15"}
                        center={[10, 0]}
                        absolute
                    />
                </View>

                {Object.keys(globalStats.staticBreakdown).length > 0 && (
                    <View style={{ marginTop: 25 }}>
                        <Text style={[styles.chartTitle, { textAlign: 'center', marginBottom: 15 }]}>Servei Estàtics Més Freqüents</Text>
                        <BarChart
                            data={{
                                labels: Object.keys(globalStats.staticBreakdown).map(k => SERVICE_NAMES[k] || k),
                                datasets: [{
                                    data: Object.values(globalStats.staticBreakdown)
                                }]
                            }}
                            width={SCREEN_WIDTH - 80}
                            height={220}
                            chartConfig={{
                                ...chartConfig,
                                backgroundGradientFrom: "#FFF",
                                backgroundGradientTo: "#FFF",
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                            }}
                            verticalLabelRotation={30}
                            fromZero
                            showValuesOnTopOfBars
                        />
                    </View>
                )}

                <View style={styles.sectionDivider} />
                <Text style={styles.listTitle}>Estadístiques per Agent</Text>
            </View>
        );
    };

    const renderAgentCard = ({ item: agentTip }) => {
        const data = statsData[agentTip];
        if (!data || data.total === 0) return null;

        const mainChartData = [
            {
                name: "Patrulla",
                population: data.patrolTotal,
                color: '#4A90E2',
                legendFontColor: "#7F7F7F",
                legendFontSize: 11
            },
            {
                name: "Estàtics",
                population: data.staticTotal,
                color: '#F5A623',
                legendFontColor: "#7F7F7F",
                legendFontSize: 11
            }
        ].filter(d => d.population > 0);

        const staticPieData = Object.keys(data.staticBreakdown).map((key, idx) => ({
            name: SERVICE_NAMES[key] || key,
            population: data.staticBreakdown[key],
            color: CHART_COLORS[idx % CHART_COLORS.length],
            legendFontColor: "#7F7F7F",
            legendFontSize: 10
        }));

        return (
            <View style={styles.agentCard}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.agentName}>{data.nom}</Text>
                        <Text style={styles.agentTip}>TIP: {data.tip}</Text>
                    </View>
                    <View style={styles.totalBadge}>
                        <Text style={styles.totalBadgeText}>{data.total}</Text>
                    </View>
                </View>

                <View style={styles.chartsRow}>
                    <View style={styles.miniChartBlock}>
                        <Text style={styles.chartTitle}>Distribució</Text>
                        <PieChart
                            data={mainChartData}
                            width={(SCREEN_WIDTH / 2) - 30}
                            height={120}
                            chartConfig={chartConfig}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"0"}
                            center={[0, 0]}
                            hasLegend={false}
                            absolute
                        />
                        <View style={styles.miniLegend}>
                            {mainChartData.map((d, i) => (
                                <View key={i} style={styles.legendItem}>
                                    <View style={[styles.legendColor, { backgroundColor: d.color }]} />
                                    <Text style={styles.legendText}>{d.name}: {d.population}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {data.staticTotal > 0 && (
                        <View style={[styles.miniChartBlock, { borderLeftWidth: 1, borderLeftColor: '#F0F0F0' }]}>
                            <Text style={styles.chartTitle}>Detall Estàtics</Text>
                            <PieChart
                                data={staticPieData}
                                width={(SCREEN_WIDTH / 2) - 30}
                                height={120}
                                chartConfig={chartConfig}
                                accessor={"population"}
                                backgroundColor={"transparent"}
                                paddingLeft={"0"}
                                center={[0, 0]}
                                hasLegend={false}
                                absolute
                            />
                            <View style={styles.miniLegend}>
                                {staticPieData.map((d, i) => (
                                    <View key={i} style={styles.legendItem}>
                                        <View style={[styles.legendColor, { backgroundColor: d.color }]} />
                                        <Text style={styles.legendText}>{d.name}: {d.population}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    const months = [
        "Gener", "Febrer", "Març", "Abril", "Maig", "Juny",
        "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"
    ];

    const years = [2026, 2027];

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.PRIMARY} />
                <Text style={{ marginTop: 15, color: '#666', fontWeight: '600' }}>Processant dades...</Text>
            </View>
        );
    }

    const activeAgtTips = Object.keys(statsData).filter(tip => statsData[tip].total > 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Estadístiques</Text>

                <View style={styles.filtersWrapper}>
                    {/* Primera fila: Rango y Periodo */}
                    <View style={styles.filtersRow}>
                        <View style={[styles.pickerContainer, { flex: 1.2 }]}>
                            <View style={styles.pickerLabelContainer}>
                                <Text style={styles.pickerLabelText}>
                                    {selectedRange === "MONTH" ? "Mensual" :
                                        selectedRange === "QUARTER" ? "Trimestral" :
                                            selectedRange === "SEMI" ? "Semestral" : "Anual"}
                                </Text>
                                <Text style={styles.pickerArrow}>▼</Text>
                            </View>
                            <Picker
                                selectedValue={selectedRange}
                                onValueChange={(val) => {
                                    setSelectedRange(val);
                                    setSelectedPeriod(0); // Reset al cambiar rango
                                }}
                                style={styles.invisiblePicker}
                                dropdownIconColor="transparent"
                            >
                                <Picker.Item label="Mensual" value="MONTH" />
                                <Picker.Item label="Trimestral" value="QUARTER" />
                                <Picker.Item label="Semestral" value="SEMI" />
                                <Picker.Item label="Anual" value="YEAR" />
                            </Picker>
                        </View>

                        {selectedRange !== "YEAR" && (
                            <View style={[styles.pickerContainer, { flex: 1.5, marginLeft: 10 }]}>
                                <View style={styles.pickerLabelContainer}>
                                    <Text style={styles.pickerLabelText} numberOfLines={1}>
                                        {selectedRange === "MONTH" ? months[selectedPeriod] :
                                            selectedRange === "QUARTER" ? `${selectedPeriod + 1}r Trim.` :
                                                `${selectedPeriod + 1}r Sem.`}
                                    </Text>
                                    <Text style={styles.pickerArrow}>▼</Text>
                                </View>
                                <Picker
                                    selectedValue={selectedPeriod}
                                    onValueChange={(val) => setSelectedPeriod(val)}
                                    style={styles.invisiblePicker}
                                    dropdownIconColor="transparent"
                                >
                                    {selectedRange === "MONTH" && months.map((m, i) => <Picker.Item key={i} label={m} value={i} />)}
                                    {selectedRange === "QUARTER" && [0, 1, 2, 3].map(i => <Picker.Item key={i} label={`${i + 1}r Trimestre`} value={i} />)}
                                    {selectedRange === "SEMI" && [0, 1].map(i => <Picker.Item key={i} label={`${i + 1}r Semestre`} value={i} />)}
                                </Picker>
                            </View>
                        )}

                        <View style={[styles.pickerContainer, { width: 90, marginLeft: 10 }]}>
                            <View style={styles.pickerLabelContainer}>
                                <Text style={styles.pickerLabelText}>{selectedYear}</Text>
                                <Text style={styles.pickerArrow}>▼</Text>
                            </View>
                            <Picker
                                selectedValue={selectedYear}
                                onValueChange={(val) => setSelectedYear(val)}
                                style={styles.invisiblePicker}
                                dropdownIconColor="transparent"
                            >
                                {years.map(y => <Picker.Item key={y} label={String(y)} value={y} />)}
                            </Picker>
                        </View>
                    </View>
                </View>
            </View>

            {activeAgtTips.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={styles.infoIcon}>
                        <Text style={{ fontSize: 30 }}>📊</Text>
                    </View>
                    <Text style={styles.emptyTitle}>Sense dades suficients</Text>
                    <Text style={styles.emptyText}>
                        No hi ha dades de torns realitzats per al període seleccionat.
                    </Text>
                    <TouchableOpacity style={styles.refreshBtn} onPress={calculateStats}>
                        <Text style={styles.refreshBtnText}>REFRESCAR</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={activeAgtTips}
                    renderItem={renderAgentCard}
                    ListHeaderComponent={renderHeader}
                    keyExtractor={tip => tip}
                    contentContainerStyle={{ paddingBottom: 120 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const chartConfig = {
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5F7FA", paddingHorizontal: 20, paddingTop: 60 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 15 },
    title: { fontSize: 32, fontWeight: "900", color: COLORS.PRIMARY, letterSpacing: -0.5 },
    filtersWrapper: { marginTop: 15 },
    filtersRow: { flexDirection: 'row', alignItems: 'center' },
    pickerContainer: { backgroundColor: 'white', borderRadius: 12, height: 45, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, overflow: 'hidden' },
    pickerLabelContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, width: '100%', height: '100%', position: 'absolute' },
    pickerLabelText: { fontSize: 13, fontWeight: '900', color: COLORS.PRIMARY },
    pickerArrow: { fontSize: 10, color: COLORS.PRIMARY, marginLeft: 4 },
    invisiblePicker: { width: '100%', height: '100%', opacity: 0 },

    globalCard: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 25, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    globalTitle: { fontSize: 12, fontWeight: '900', color: '#AAA', letterSpacing: 1.5, marginBottom: 15, textAlign: 'center' },
    globalStatsRow: { flexDirection: 'row', marginBottom: 10 },
    globalStatItem: { flex: 1, alignItems: 'center' },
    globalStatValue: { fontSize: 28, fontWeight: '900', color: COLORS.PRIMARY },
    globalStatLabel: { fontSize: 10, fontWeight: '800', color: '#888', marginTop: 2 },

    sectionDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 20 },
    listTitle: { fontSize: 18, fontWeight: '900', color: '#333', marginBottom: 10 },

    agentCard: { backgroundColor: 'white', borderRadius: 20, padding: 15, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8F8F8', paddingBottom: 10, marginBottom: 10 },
    agentName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
    agentTip: { fontSize: 11, color: COLORS.PRIMARY, fontWeight: '700', marginTop: 2 },
    totalBadge: { backgroundColor: COLORS.PRIMARY, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    totalBadgeText: { color: 'white', fontWeight: '900', fontSize: 14 },

    chartsRow: { flexDirection: 'row', justifyContent: 'space-between' },
    miniChartBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
    chartTitle: { fontSize: 9, fontWeight: '900', color: '#BBB', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },

    miniLegend: { marginTop: 5, width: '100%' },
    legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
    legendColor: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
    legendText: { fontSize: 10, color: '#666', fontWeight: '600' },

    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: -60 },
    infoIcon: { width: 70, height: 70, backgroundColor: 'white', borderRadius: 35, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 4 },
    emptyTitle: { fontSize: 20, fontWeight: '900', color: '#333', marginBottom: 10 },
    emptyText: { textAlign: 'center', color: '#888', fontSize: 15, lineHeight: 22 },
    refreshBtn: { marginTop: 30, backgroundColor: COLORS.PRIMARY, paddingHorizontal: 25, paddingVertical: 12, borderRadius: 12 },
    refreshBtnText: { color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 1 }
});

