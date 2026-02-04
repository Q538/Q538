import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, InteractionManager, Linking, Alert } from 'react-native';
import { COLORS } from '../theme/colors';
import { getCalendarNotes, getAgents, getAgentDetail, getEmailRecipientsPerll } from '../services/database';

const SupportScreen = ({ session, onEditNote }) => {
    const [calendarNotes, setCalendarNotes] = useState({});
    const [allAgentsMap, setAllAgentsMap] = useState({});
    const scrollRef = useRef(null);
    const layoutMap = useRef({});
    const [hasScrolled, setHasScrolled] = useState(false);
    const userTip = String(session?.user?.tip || "");
    const isAdmin = session?.perfil === "ADMIN";

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

    const loadNotes = async () => {
        let notes = await getCalendarNotes();

        // 🚨 NETEJA TEMPORAL: Borrar dates residuals sol·licitades per l'usuari (03/01 i 17/01)
        const d1 = new Date(2026, 0, 3).toDateString();
        const d2 = new Date(2026, 0, 17).toDateString();
        let hasChanged = false;
        if (notes[d1]) { delete notes[d1]; hasChanged = true; }
        if (notes[d2]) { delete notes[d2]; hasChanged = true; }
        if (hasChanged) {
            const { saveCalendarNotes } = require('../services/database');
            await saveCalendarNotes(notes);
        }

        setCalendarNotes(notes || {});

        if (isAdmin) {
            const agentMap = {};
            for (let g = 1; g <= 5; g++) {
                const agents = await getAgents(g);
                for (const a of agents) {
                    const detail = await getAgentDetail(a.tip);
                    agentMap[String(a.tip).trim()] = { ...a, ...detail };
                }
            }
            setAllAgentsMap(agentMap);
        } else if (userTip) {
            const detail = await getAgentDetail(userTip);
            setAllAgentsMap({
                [userTip]: {
                    tip: userTip,
                    nom: session?.user?.nom || "Jo",
                    categoria: session?.user?.categoria || "AGENT",
                    ...detail
                }
            });
        }
    };

    // 🔹 Auto-scroll a la semana actual
    useEffect(() => {
        if (Object.keys(calendarNotes).length > 0 && !hasScrolled) {
            const timer = setTimeout(() => {
                const today = new Date();
                const monday = getMonday(today);
                monday.setHours(0, 0, 0, 0);
                const currentWeekKey = monday.toDateString();

                if (layoutMap.current[currentWeekKey] !== undefined) {
                    scrollRef.current?.scrollTo({
                        y: layoutMap.current[currentWeekKey],
                        animated: true
                    });
                    setHasScrolled(true);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [calendarNotes]);

    const getTurnForDate = (date, grup) => {
        const pattern = "TTTTTFFNNNNNNNFFFFFFFMMMMMMMFFFFFFF";
        const referenceDate = new Date(2026, 1, 2, 12, 0, 0); // 02/02/2026
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

    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const handleSendPerllEmails = async (weekData) => {
        const recipients = await getEmailRecipientsPerll();
        if (!recipients) {
            return Alert.alert("Sense correus", "No hi ha correus configurats per a perllongaments en la configuració.");
        }

        const dateRange = `${weekData.startDate.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })} - ${weekData.endDate.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' })}`;
        let body = `PERLLONGAMENTS DE LA SETMANA (${dateRange})\n\n`;

        const perllGroups = [];
        const seenGroupKeys = new Set();
        [...weekData.perllongaments]
            .sort((a, b) => a.date - b.date)
            .forEach(item => {
                const dateKey = item.date.toDateString();
                const chili = item.data.perllongament?.diligencies || "";
                const mot = item.data.perllongament?.motiu || "";
                const groupKey = `${dateKey}_${chili}_${mot}`;
                if (!seenGroupKeys.has(groupKey)) {
                    seenGroupKeys.add(groupKey);
                    perllGroups.push({
                        date: item.date,
                        motiu: mot,
                        diligencies: chili,
                        agents: item.data.perllongament?.agents || []
                    });
                }
            });

        perllGroups.forEach(group => {
            const dStr = group.date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit' });
            body += `DIA ${dStr}\n`;
            body += `MOTIU: ${group.motiu || "—"}\n`;
            body += `DILIGÈNCIES: ${group.diligencies || "—"}\n`;

            [...(group.agents || [])]
                .sort((a, b) => {
                    const tipA = String(typeof a === 'object' ? a.tip : a);
                    const tipB = String(typeof b === 'object' ? b.tip : b);
                    return tipA.localeCompare(tipB);
                })
                .forEach(ag => {
                    const tip = typeof ag === 'object' ? ag.tip : ag;
                    let detail = `${tip}`;
                    if (typeof ag === 'object' && ag.hora && ag.hora.includes(' - ')) {
                        const [h1, h2] = ag.hora.split(' - ');
                        const d1 = ag.data1 || ag.data || "";
                        const d2 = ag.data2 || ag.data || "";
                        try {
                            const [m1h, m1m] = h1.split(':').map(Number);
                            const [m2h, m2m] = h2.split(':').map(Number);
                            let diff = (m2h * 60 + m2m) - (m1h * 60 + m1m);
                            if (diff < 0) diff += 1440;
                            detail = `${tip} ${h1} ${d1}, ${h2} ${d2}, (${diff}')`;
                        } catch (e) { detail = `${tip} ${ag.hora}`; }
                    }
                    body += `• ${detail}\n`;
                });
            body += `\n`;
        });

        const subject = encodeURIComponent(`Perllongaments Setmana ${dateRange}`);
        const mailBody = encodeURIComponent(body);
        const url = `mailto:${recipients}?subject=${subject}&body=${mailBody}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert("Error", "No s'ha pogut obrir l'aplicació de correu.");
            }
        });
    };

    const renderSimpleSummary = (title, items, color) => {
        const groupedByDay = {};
        items.forEach(item => {
            const dKey = item.date.toDateString();
            if (!groupedByDay[dKey]) groupedByDay[dKey] = [];
            groupedByDay[dKey].push(item);
        });

        const sortedDays = Object.keys(groupedByDay).sort((a, b) => new Date(a) - new Date(b));

        return (
            <View style={[styles.perllongamentsSection, { borderTopWidth: 2, borderTopColor: '#F0F0F0' }]}>
                <Text style={[styles.perllongamentsTitle, { color: color }]}>{title}</Text>
                <View style={[styles.plList, { backgroundColor: 'white', borderLeftWidth: 3, borderLeftColor: color }]}>
                    {sortedDays.map((dKey, idx) => {
                        const dayItems = groupedByDay[dKey];
                        const dateObj = new Date(dKey);
                        return (
                            <View key={dKey} style={[styles.perllongamentGroup, { borderBottomWidth: idx < sortedDays.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }]}>
                                <View style={[styles.plDateBox, { backgroundColor: color }]}>
                                    <Text style={styles.plDateText}>{dateObj.toLocaleDateString('ca-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).charAt(0).toUpperCase() + dateObj.toLocaleDateString('ca-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).slice(1)}</Text>
                                </View>
                                <View style={{ marginTop: 5 }}>
                                    {dayItems.sort((a, b) => a.tip.localeCompare(b.tip)).map((item, iIdx) => {
                                        const agent = allAgentsMap[item.tip] || { nom: "Agent" };
                                        return (
                                            <TouchableOpacity
                                                key={iIdx}
                                                onPress={() => onEditNote && onEditNote(new Date(dKey), item.tip, item.status)}
                                                activeOpacity={0.6}
                                            >
                                                <Text style={styles.plAgentDetailText}>
                                                    • {item.tip} - {agent.nom}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderNoteItem = (item, idx) => {
        const st = item.status;
        const dStr = item.date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        let timeLabel = null;
        if (st === "PERLLONGAMENT" && item.data.perllongament) {
            const myEntry = item.data.perllongament.agents?.find(a => String(a.tip || (typeof a === 'object' ? a.tip : a)) === String(item.tip));
            if (myEntry && myEntry.hora && myEntry.hora.includes(' - ')) {
                try {
                    const [h1, h2] = myEntry.hora.split(' - ');
                    const [m1h, m1m] = h1.split(':').map(Number);
                    const [m2h, m2m] = h2.split(':').map(Number);
                    let diff = (m2h * 60 + m2m) - (m1h * 60 + m1m);
                    if (diff < 0) diff += 1440;
                    timeLabel = `${myEntry.hora} ${dStr} (${diff}')`;
                } catch (e) { timeLabel = `${myEntry.hora} ${dStr}`; }
            } else if (item.data.perllongament.startTime && item.data.perllongament.endTime) {
                try {
                    const h1 = item.data.perllongament.startTime;
                    const h2 = item.data.perllongament.endTime;
                    const [m1h, m1m] = h1.split(':').map(Number);
                    const [m2h, m2m] = h2.split(':').map(Number);
                    let diff = (m2h * 60 + m2m) - (m1h * 60 + m1m);
                    if (diff < 0) diff += 1440;
                    timeLabel = `${h1} - ${h2} ${dStr} (${diff}')`;
                } catch (e) { timeLabel = `${item.data.perllongament.startTime} - ${item.data.perllongament.endTime} ${dStr}`; }
            } else {
                timeLabel = `(') ${dStr}`;
            }
        } else if (st === "JUDICI") {
            const hora = item.data.judici?.hora || "";
            timeLabel = `${hora} ${dStr}`;
        } else if (["VACANCES", "BAIXA", "PERMÍS", "AP", "ALTRES", "ROMANENT"].includes(st)) {
            const dStr = item.date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const stKey = st.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let specificData = item.data[stKey];

            // Fallback per ROMANENT si s'ha guardat fora del seu key (encara que ho hem arreglat)
            if (st === "ROMANENT" && !specificData && item.data.romanent) specificData = item.data.romanent;

            let isFull = false;
            let pData = null;

            if (st === "ROMANENT") {
                timeLabel = `${specificData?.start || ""} - ${specificData?.end || ""} ${dStr}`;
            } else if (specificData && specificData.fullDay !== undefined) {
                isFull = specificData.fullDay;
                pData = specificData.partial;
                if (isFull) timeLabel = `TORN SENCER ${dStr}`;
                else if (pData) timeLabel = `${pData.start} - ${pData.end} ${dStr}`;
            } else {
                isFull = item.data.fullDay;
                pData = item.data.partial;
                if (isFull) timeLabel = `TORN SENCER ${dStr}`;
                else if (pData) timeLabel = `${pData.start} - ${pData.end} ${dStr}`;
                else timeLabel = ["PERMÍS", "AP", "ALTRES"].includes(st) ? `TORN SENCER ${dStr}` : dStr;
            }
        }

        return (
            <TouchableOpacity
                key={idx}
                activeOpacity={0.6}
                onPress={() => onEditNote && (isAdmin || String(item.tip) === userTip) && onEditNote(item.date, item.tip, item.status)}
                style={[{ paddingVertical: 4 }, isAdmin ? { borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: '#E8EDF5' } : { marginBottom: 2 }]}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={[styles.miniStatusBadge, { backgroundColor: STATUS_LIGHT_COLORS[st], minWidth: isAdmin ? 100 : 80, height: 20, justifyContent: 'center' }]}>
                        <Text style={[styles.miniStatusText, !isAdmin && { fontSize: 9 }]}>{st}</Text>
                    </View>
                    {timeLabel && (
                        <Text style={{ fontSize: isAdmin ? 11 : 10, fontWeight: '700', color: '#666', marginRight: 5 }}>
                            {timeLabel}
                        </Text>
                    )}
                </View>

                {st === "PERLLONGAMENT" && item.data.perllongament ? (
                    <View style={{ marginLeft: 5, marginTop: 2 }}>
                        {item.data.perllongament.motiu ? (
                            <Text style={{ fontSize: 10, color: '#666', fontWeight: '800' }}>• MOTIU: {item.data.perllongament.motiu}</Text>
                        ) : null}
                        {item.data.perllongament.diligencies ? (
                            <Text style={{ fontSize: 10, color: '#666', fontWeight: '800' }}>• DILIGÈNCIES: {item.data.perllongament.diligencies}</Text>
                        ) : null}
                    </View>
                ) : null}

                {st === "JUDICI" && item.data.judici ? (
                    <View style={{ marginLeft: 5, marginTop: 2 }}>
                        <Text style={{ fontSize: 10, color: '#666', fontWeight: '800' }}>
                            {item.data.judici.jutjat ? `JUTJAT: ${item.data.judici.jutjat.toUpperCase()}` : ''}
                            {item.data.judici.tipus ? ` (${item.data.judici.tipus.toUpperCase()})` : ''}
                            {item.data.judici.numJutjat ? ` Nº:${item.data.judici.numJutjat}` : ''}
                            {item.data.judici.sala ? ` SALA: ${item.data.judici.sala.toUpperCase()}` : ''}
                        </Text>
                    </View>
                ) : null}

                {st !== "JUDICI" && item.data.note ? (
                    <View style={[{ marginTop: 4, padding: 6, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: COLORS.PRIMARY, marginLeft: 5 }, isAdmin ? { backgroundColor: '#F9F9F9' } : { backgroundColor: '#F0F2F5' }]}>
                        <Text style={{ fontSize: isAdmin ? 13 : 12, color: '#555', fontStyle: 'italic' }}>{item.data.note}</Text>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    };

    const renderWeekSection = (weekData, weekKey) => {
        const sortedDayKeys = Object.keys(weekData.days).sort((a, b) => new Date(a) - new Date(b));
        const categoryOrder = { "SERGENT": 0, "CAPORAL": 1, "AGENT": 2 };

        return (
            <View
                key={weekKey}
                style={[styles.weekSection, !isAdmin && { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0, padding: 0, marginBottom: 20 }]}
                onLayout={(e) => {
                    layoutMap.current[weekKey] = e.nativeEvent.layout.y;
                }}
            >
                <View style={[styles.weekHeader, !isAdmin && { marginBottom: 10, paddingBottom: 5, borderBottomColor: '#DDD' }]}>
                    <Text style={[styles.weekTitle, !isAdmin && { fontSize: 16 }]}>SETMANA {weekData.turnLabel}</Text>
                    <Text style={styles.weekSubtitle}>
                        {weekData.startDate.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {weekData.endDate.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </Text>
                </View>

                {sortedDayKeys.map(dayKey => {
                    const dayUsers = weekData.days[dayKey];
                    const sortedTips = Object.keys(dayUsers).sort((a, b) => {
                        const agentA = allAgentsMap[a];
                        const agentB = allAgentsMap[b];
                        const catA = categoryOrder[agentA?.categoria] ?? 99;
                        const catB = categoryOrder[agentB?.categoria] ?? 99;
                        if (catA !== catB) return catA - catB;
                        return a.localeCompare(b);
                    });

                    return (
                        <View key={dayKey} style={[styles.adminDaySection, !isAdmin && { backgroundColor: 'transparent', borderWidth: 0, padding: 0, marginBottom: 5 }]}>
                            <View style={[styles.adminDayHeader, !isAdmin && { marginBottom: 0, borderBottomWidth: 0 }]}>
                                <Text style={[styles.adminDayHeaderText, !isAdmin && { fontSize: 12, color: '#666' }]}>
                                    {new Date(dayKey).toLocaleDateString('ca-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()}
                                </Text>
                            </View>

                            {sortedTips.map(tip => {
                                const agent = allAgentsMap[tip] || { tip: tip, nom: "Agent" };
                                const userDayNotes = dayUsers[tip];

                                return (
                                    <View
                                        key={tip}
                                        style={[styles.adminUserSection, !isAdmin && { borderTopWidth: 0, borderBottomWidth: 0, shadowOpacity: 0, elevation: 0, backgroundColor: 'transparent', marginBottom: 0, borderWidth: 0, borderRadius: 0 }]}
                                    >
                                        {isAdmin && (
                                            <TouchableOpacity
                                                style={{ backgroundColor: '#F8F9FA', padding: 4, borderBottomWidth: 1, borderBottomColor: '#E1E4E8' }}
                                                onPress={() => onEditNote && onEditNote(new Date(dayKey), tip)}
                                            >
                                                <Text style={{ fontSize: 12, fontWeight: '900', color: COLORS.PRIMARY }}>
                                                    TIP {tip} — {agent.nom}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        <View style={[{ paddingHorizontal: 12, paddingVertical: 4 }, !isAdmin && { paddingHorizontal: 4, paddingVertical: 0 }]}>
                                            {userDayNotes.map((item, idx) => renderNoteItem(item, idx))}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    );
                })}

                {isAdmin && weekData.vacances.length > 0 && renderSimpleSummary("VACANCES", weekData.vacances, "#2E7D32")}
                {isAdmin && weekData.baixes.length > 0 && renderSimpleSummary("BAIXES", weekData.baixes, "#D32F2F")}

                {weekData.perllongaments.length > 0 && (
                    <View style={styles.perllongamentsSection}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                            <Text style={[styles.perllongamentsTitle, { marginBottom: 0, color: '#424242' }]}>PERLLONGAMENTS</Text>
                            {isAdmin && (
                                <TouchableOpacity
                                    style={[styles.plAddBtn, { backgroundColor: '#424242' }]}
                                    onPress={() => handleSendPerllEmails(weekData)}
                                >
                                    <Text style={styles.plAddBtnText}>+</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={[styles.plList, { borderLeftWidth: 3, borderLeftColor: '#424242' }]}>
                            {(() => {
                                // Group perllongaments by date first
                                const byDate = {};
                                [...weekData.perllongaments]
                                    .sort((a, b) => a.date - b.date)
                                    .forEach(item => {
                                        const dateKey = item.date.toDateString();
                                        if (!byDate[dateKey]) {
                                            byDate[dateKey] = {
                                                date: item.date,
                                                groups: []
                                            };
                                        }

                                        const chili = item.data.perllongament?.diligencies || "";
                                        const mot = item.data.perllongament?.motiu || "";
                                        const groupKey = `${chili}_${mot}`;

                                        let existingGroup = byDate[dateKey].groups.find(g => g.groupKey === groupKey);
                                        if (!existingGroup) {
                                            existingGroup = {
                                                groupKey: groupKey,
                                                motiu: mot,
                                                diligencies: chili,
                                                agents: []
                                            };
                                            byDate[dateKey].groups.push(existingGroup);
                                        }

                                        const agentList = item.data.perllongament?.agents || [];
                                        agentList.forEach(ag => {
                                            const agTip = typeof ag === 'object' ? ag.tip : ag;
                                            if (!existingGroup.agents.find(a => (typeof a === 'object' ? a.tip : a) === agTip)) {
                                                existingGroup.agents.push(ag);
                                            }
                                        });
                                    });

                                const sortedDates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b));

                                return sortedDates.map((dateKey, dIdx) => {
                                    const dayData = byDate[dateKey];

                                    // Sort groups within each day
                                    const motiuOrder = [
                                        "Novetats Cap de Torn",
                                        "Novetats Instrucció",
                                        "Novetats OAC",
                                        "Novetats Custòdia",
                                        "Novetats Incidencies"
                                    ];

                                    dayData.groups.sort((a, b) => {
                                        const indexA = motiuOrder.indexOf(a.motiu);
                                        const indexB = motiuOrder.indexOf(b.motiu);

                                        // If both are in the priority list, sort by priority
                                        if (indexA !== -1 && indexB !== -1) {
                                            return indexA - indexB;
                                        }

                                        // If only A is in priority list, A comes first
                                        if (indexA !== -1) return -1;

                                        // If only B is in priority list, B comes first
                                        if (indexB !== -1) return 1;

                                        // Both are not in priority list, sort by diligencies number
                                        const numA = parseInt(a.diligencies) || 0;
                                        const numB = parseInt(b.diligencies) || 0;
                                        return numA - numB;
                                    });

                                    return (
                                        <View key={`day-${dIdx}`} style={[styles.perllongamentGroup, { borderBottomWidth: dIdx < sortedDates.length - 1 ? 1 : 0 }]}>
                                            <View style={[styles.plDateBox, { backgroundColor: '#424242', marginBottom: 10 }]}>
                                                <Text style={styles.plDateText}>{dayData.date.toLocaleDateString('ca-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).charAt(0).toUpperCase() + dayData.date.toLocaleDateString('ca-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).slice(1)}</Text>
                                            </View>

                                            {dayData.groups.map((group, gIdx) => (
                                                <View key={`grp-${gIdx}`} style={{ marginBottom: gIdx < dayData.groups.length - 1 ? 15 : 0 }}>
                                                    <Text style={[styles.plMotiuLine, { marginBottom: 6 }]}>
                                                        MOTIU: <Text style={{ color: '#333' }}>{group.motiu || "—"}</Text>   DILIGÈNCIES: <Text style={{ color: '#333' }}>{group.diligencies || "—"}</Text>
                                                    </Text>

                                                    {[...(group.agents || [])]
                                                        .sort((a, b) => {
                                                            const tipA = String(typeof a === 'object' ? a.tip : a);
                                                            const tipB = String(typeof b === 'object' ? b.tip : b);
                                                            return tipA.localeCompare(tipB);
                                                        })
                                                        .map((ag, aIdx) => {
                                                            const tip = typeof ag === 'object' ? ag.tip : ag;
                                                            const agent = allAgentsMap[tip] || { nom: "Agent" };
                                                            let detail = `${tip}`;

                                                            if (typeof ag === 'object' && ag.hora && ag.hora.includes(' - ')) {
                                                                // Manual perllongament with hora field
                                                                const [h1, h2] = ag.hora.split(' - ');
                                                                const d1 = ag.data1 || ag.data || "";
                                                                const d2 = ag.data2 || ag.data || "";
                                                                try {
                                                                    const [m1h, m1m] = h1.split(':').map(Number);
                                                                    const [m2h, m2m] = h2.split(':').map(Number);
                                                                    let diff = (m2h * 60 + m2m) - (m1h * 60 + m1m);
                                                                    if (diff < 0) diff += 1440;
                                                                    detail = `${tip} ${h1} ${d1}, ${h2} ${d2}, (${diff}')`;
                                                                } catch (e) { detail = `${tip} ${ag.hora}`; }
                                                            } else {
                                                                // Automatic perllongament - get times from perllongament object
                                                                const perlData = weekData.perllongaments.find(p =>
                                                                    p.date.toDateString() === dayData.date.toDateString() &&
                                                                    String(p.tip) === String(tip)
                                                                );

                                                                if (perlData && perlData.data.perllongament) {
                                                                    const startTime = perlData.data.perllongament.startTime || "";
                                                                    const endTime = perlData.data.perllongament.endTime || "";
                                                                    const dateStr = dayData.date.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

                                                                    if (startTime && endTime) {
                                                                        try {
                                                                            const [sh, sm] = startTime.split(':').map(Number);
                                                                            const [eh, em] = endTime.split(':').map(Number);
                                                                            let diff = (eh * 60 + em) - (sh * 60 + sm);
                                                                            if (diff < 0) diff += 1440;
                                                                            detail = `${tip} ${startTime} ${dateStr}, ${endTime} ${dateStr}, (${diff}')`;
                                                                        } catch (e) {
                                                                            detail = `${tip} ${startTime} - ${endTime}`;
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                            return (
                                                                <TouchableOpacity
                                                                    key={`aga-${aIdx}`}
                                                                    onPress={() => onEditNote && onEditNote(dayData.date, tip)}
                                                                    activeOpacity={0.6}
                                                                >
                                                                    <Text style={styles.plAgentDetailText}>
                                                                        • {detail}
                                                                    </Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })
                                                    }
                                                </View>
                                            ))}
                                        </View>
                                    );
                                });
                            })()}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    const renderAdminList = () => {
        const weeks = {};

        Object.keys(calendarNotes).forEach(dateStr => {
            const dateObj = new Date(dateStr);
            if (isNaN(dateObj.getTime())) return;

            const monday = getMonday(dateObj);
            monday.setHours(0, 0, 0, 0);
            const weekKey = monday.toDateString();

            if (!weeks[weekKey]) {
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);

                const turnKey = getTurnForDate(monday, 4);
                const turnLabel = turnKey === 'M' ? 'MATINS' : turnKey === 'T' ? 'TARDA' : turnKey === 'N' ? 'NITS' : 'FESTA';

                weeks[weekKey] = {
                    startDate: monday,
                    endDate: sunday,
                    turnLabel: turnLabel,
                    days: {},
                    perllongaments: [],
                    vacances: [],
                    baixes: []
                };
            }

            const dayKey = dateObj.toDateString();
            const dayData = calendarNotes[dateStr];

            Object.keys(dayData).forEach(tip => {
                const userData = dayData[tip];
                const statuses = userData.statuses || (userData.status ? [userData.status] : []);

                statuses.forEach(st => {
                    const noteItem = {
                        date: dateObj,
                        status: st,
                        data: userData,
                        tip: tip
                    };

                    if (st === "VACANCES") {
                        weeks[weekKey].vacances.push(noteItem);
                    } else if (st === "BAIXA") {
                        weeks[weekKey].baixes.push(noteItem);
                    } else if (st === "PERLLONGAMENT") {
                        // 🔹 Filtre ADM: Només de dies passats o d'avui si ja ha començat el torn
                        const now = new Date();
                        const itemDate = new Date(dateObj);
                        itemDate.setHours(0, 0, 0, 0);

                        const todayMidnight = new Date(now);
                        todayMidnight.setHours(0, 0, 0, 0);

                        if (itemDate > todayMidnight) {
                            // És un dia futur, no el mostrem encara
                            return;
                        }

                        if (itemDate.getTime() === todayMidnight.getTime()) {
                            // És avui, mirem si ha començat el torn
                            const agent = allAgentsMap[tip];
                            if (agent) {
                                const turn = getTurnForDate(itemDate, agent.grup || 4);
                                const { start: shiftStart } = getShiftHours(itemDate, turn);
                                const [shStr, smStr] = shiftStart.split(':').map(Number);

                                const shiftStartTime = new Date(now);
                                shiftStartTime.setHours(shStr, smStr, 0, 0);

                                if (now < shiftStartTime) {
                                    // Avui encara no ha començat el seu torn, no mostrem el perllongament encara
                                    return;
                                }
                            }
                        }

                        // Perllongaments only go to the dedicated section, not to daily lines
                        weeks[weekKey].perllongaments.push(noteItem);
                    } else {
                        // Judici, Permís, AP, Altres go to daily lines
                        if (!weeks[weekKey].days[dayKey]) weeks[weekKey].days[dayKey] = {};
                        if (!weeks[weekKey].days[dayKey][tip]) weeks[weekKey].days[dayKey][tip] = [];
                        weeks[weekKey].days[dayKey][tip].push(noteItem);
                    }
                });
            });
        });

        const sortedWeekKeys = Object.keys(weeks).sort((a, b) => new Date(b) - new Date(a));
        return sortedWeekKeys.map(weekKey => renderWeekSection(weeks[weekKey], weekKey));
    };

    const renderUserList = () => {
        const weeks = {};

        Object.keys(calendarNotes).forEach(dateStr => {
            const dayData = calendarNotes[dateStr];
            if (!dayData) return;

            const matchedTipKey = Object.keys(dayData).find(
                key => String(key).trim() === userTip.trim()
            );

            if (matchedTipKey) {
                const dateObj = new Date(dateStr);
                const monday = getMonday(dateObj);
                monday.setHours(0, 0, 0, 0);
                const weekKey = monday.toDateString();

                if (!weeks[weekKey]) {
                    const sunday = new Date(monday);
                    sunday.setDate(monday.getDate() + 6);
                    const turnKey = getTurnForDate(monday, session?.grup || 4);
                    const turnLabel = turnKey === 'M' ? 'MATINS' : turnKey === 'T' ? 'TARDA' : turnKey === 'N' ? 'NITS' : 'FESTA';

                    weeks[weekKey] = {
                        startDate: monday,
                        endDate: sunday,
                        turnLabel: turnLabel,
                        days: {},
                        perllongaments: [],
                        vacances: [],
                        baixes: []
                    };
                }

                const dayKey = dateObj.toDateString();
                const tip = userTip;
                const userData = dayData[matchedTipKey];
                const statuses = userData.statuses || (userData.status ? [userData.status] : []);

                statuses.forEach(st => {
                    const noteItem = { date: dateObj, status: st, data: userData, tip: tip };

                    // En modo usuario, listamos TODO cronológicamente día a día
                    if (!weeks[weekKey].days[dayKey]) weeks[weekKey].days[dayKey] = {};
                    if (!weeks[weekKey].days[dayKey][tip]) weeks[weekKey].days[dayKey][tip] = [];
                    weeks[weekKey].days[dayKey][tip].push(noteItem);
                });
            }
        });

        const sortedWeekKeys = Object.keys(weeks).sort((a, b) => new Date(b) - new Date(a));

        if (sortedWeekKeys.length === 0) {
            return (
                <View style={styles.emptyListContainer}>
                    <Text style={styles.placeholderIcon}>📝</Text>
                    <Text style={styles.emptyListText}>No tens cap anotació registrada.</Text>
                    <Text style={styles.emptyListSubtext}>Pots afegir les teves absències, judicis o perllongaments des de l'apartat de Calendari.</Text>
                </View>
            );
        }

        return sortedWeekKeys.map(weekKey => renderWeekSection(weeks[weekKey], weekKey));
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{isAdmin ? "Suport Administració" : "Les meves Anotacions"}</Text>
                </View>
            </View>

            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
            >
                {isAdmin ? renderAdminList() : renderUserList()}
                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    headerRow: {
        paddingTop: 45,
        paddingHorizontal: 25,
        paddingBottom: 10,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE'
    },
    title: {
        fontSize: 28,
        fontWeight: "900",
        color: COLORS.PRIMARY
    },
    scroll: {
        padding: 20
    },
    monthListSection: {
        marginBottom: 30
    },
    monthListTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#999',
        marginBottom: 10,
        marginTop: 10,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginLeft: 5
    },
    dayListItem: {
        backgroundColor: 'white',
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 15,
        marginBottom: 4,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3
    },
    dayListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    dayListDate: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555'
    },
    miniStatusBadge: {
        minWidth: 80,
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    miniStatusText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#333'
    },
    durationBadge: {
        backgroundColor: '#F0F4F8',
        minWidth: 80,
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#D1E3F0',
    },
    durationText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1565C0'
    },
    noteBox: {
        backgroundColor: '#F9F9F9',
        padding: 10,
        borderRadius: 8,
        marginTop: 5,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.PRIMARY
    },
    dayListNote: {
        fontSize: 16,
        color: '#666',
        fontStyle: 'italic',
        lineHeight: 24
    },
    dayListSubInfo: {
        fontSize: 14,
        color: COLORS.PRIMARY,
        fontWeight: '700',
        marginTop: 6
    },
    weekSection: {
        marginBottom: 40,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5
    },
    weekHeader: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 10
    },
    weekTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: COLORS.PRIMARY,
        letterSpacing: 1
    },
    weekSubtitle: {
        fontSize: 12,
        color: '#888',
        fontWeight: '600',
        marginTop: 2
    },
    adminDaySection: {
        marginBottom: 15,
        backgroundColor: '#FCFDFF',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E8EDF5'
    },
    adminDayHeader: {
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F2F5',
        paddingBottom: 5
    },
    adminDayHeaderText: {
        fontSize: 15,
        fontWeight: '900',
        color: COLORS.PRIMARY,
        letterSpacing: 1
    },
    adminUserSection: {
        marginBottom: 12,
        backgroundColor: '#FFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E1E4E8',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        overflow: 'hidden'
    },
    adminUserTip: {
        fontSize: 13,
        fontWeight: '900',
        color: '#333',
        marginBottom: 10,
        backgroundColor: '#F0F2F5',
        padding: 8,
        borderRadius: 8,
        overflow: 'hidden'
    },
    perllongamentsSection: {
        marginTop: 10,
        borderTopWidth: 2,
        borderTopColor: '#F0F0F0',
        paddingTop: 10
    },
    perllongamentsTitle: {
        fontSize: 15,
        fontWeight: '900',
        color: '#D32F2F',
        marginBottom: 15,
        letterSpacing: 0.5
    },
    plAddBtn: {
        backgroundColor: '#D32F2F',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3
    },
    plAddBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        marginTop: -2
    },
    plList: {
        backgroundColor: '#FFF8F8',
        borderRadius: 12,
        padding: 10
    },
    perllongamentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE0E0'
    },
    plDateBox: {
        backgroundColor: '#D32F2F',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start'
    },
    plDateText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold'
    },
    plInfoBox: {
        flex: 1
    },
    plAgentText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333'
    },
    plTimeText: {
        fontSize: 12,
        color: '#D32F2F',
        fontWeight: '700'
    },
    perllongamentGroup: {
        paddingVertical: 5,
        borderBottomColor: '#FFE0E0'
    },
    plMotiuLine: {
        fontSize: 11,
        fontWeight: '900',
        color: '#888',
        flex: 1
    },
    plAgentDetailText: {
        fontSize: 11,
        color: '#444',
        marginLeft: 0,
        marginBottom: 2,
        fontWeight: '600'
    },
    emptyListContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center'
    },
    placeholderIcon: {
        fontSize: 60,
        marginBottom: 20,
    },
    emptyListText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#999',
        textAlign: 'center'
    },
    emptyListSubtext: {
        fontSize: 14,
        color: '#AAA',
        textAlign: 'center',
        marginTop: 15,
        lineHeight: 20
    }
});

export default SupportScreen;
