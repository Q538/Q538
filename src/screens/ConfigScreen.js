import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator, Platform, Modal } from "react-native";
import { COLORS } from "../theme/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getEmailRecipients, saveEmailRecipients, getEmailRecipientsPerll, saveEmailRecipientsPerll, getRotationHistory, getAssignments, getCustomServices, getManualAgents, getAgents, getSelectedGrup, getAutoPerlRules, saveAutoPerlRules } from "../services/database";
import XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function ConfigScreen({ setSession }) {
  const [emailCategory, setEmailCategory] = useState("QUADRANT");
  const [emailListQuad, setEmailListQuad] = useState([]);
  const [emailListPerll, setEmailListPerll] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [history, setHistory] = useState({});
  const [exporting, setExporting] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  const [autoPerlRules, setAutoPerlRules] = useState([]);

  useEffect(() => {
    loadEmails();
    loadHistory();
    loadRules();
  }, []);

  const loadRules = async () => {
    const r = await getAutoPerlRules();
    setAutoPerlRules(r);
  };

  const loadHistory = async () => {
    const h = await getRotationHistory();
    setHistory(h);
  };

  const handleLogout = () => {
    Alert.alert(
      "Tancar Sessió",
      "Vols tancar la sessió d'Administrador?",
      [
        { text: "Cancel·lar", style: "cancel" },
        {
          text: "Tancar Sessió",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("@user_session");
            if (setSession) setSession(null);
          }
        }
      ]
    );
  };

  const loadEmails = async () => {
    const q = await getEmailRecipients();
    const p = await getEmailRecipientsPerll();
    if (q) setEmailListQuad(q.split(",").filter(e => e.trim()));
    if (p) setEmailListPerll(p.split(",").filter(e => e.trim()));
  };

  const handleAddEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!trimmed.includes("@")) return Alert.alert("Error", "Introdueix un correu vàlid.");

    if (emailCategory === "QUADRANT") {
      if (emailListQuad.includes(trimmed)) return Alert.alert("Error", "Ja existeix.");
      const newList = [...emailListQuad, trimmed];
      setEmailListQuad(newList);
      saveEmailRecipients(newList.join(","));
    } else {
      if (emailListPerll.includes(trimmed)) return Alert.alert("Error", "Ja existeix.");
      const newList = [...emailListPerll, trimmed];
      setEmailListPerll(newList);
      saveEmailRecipientsPerll(newList.join(","));
    }
    setEmailInput("");
  };

  const removeEmail = (email) => {
    if (emailCategory === "QUADRANT") {
      const newList = emailListQuad.filter(e => e !== email);
      setEmailListQuad(newList);
      saveEmailRecipients(newList.join(","));
    } else {
      const newList = emailListPerll.filter(e => e !== email);
      setEmailListPerll(newList);
      saveEmailRecipientsPerll(newList.join(","));
    }
  };

  const handleUpdateRule = (id, field, value) => {
    const updated = autoPerlRules.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    setAutoPerlRules(updated);
    saveAutoPerlRules(updated);
  };

  const openEmailModal = (cat) => {
    setEmailCategory(cat);
    setEmailModalVisible(true);
  };

  const getTurnForDate = (date, grup) => {
    const pattern = "TTTTTFFNNNNNNNFFFFFFFMMMMMMMFFFFFFF";
    const referenceDate = new Date(2026, 1, 2, 12, 0, 0);
    const calcDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const diffTime = calcDate.getTime() - referenceDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const startPoint = 7;
    const escamotOffset = (4 - grup) * 7;
    const cyclePosition = (diffDays + startPoint + escamotOffset + 35000) % 35;
    return pattern[cyclePosition];
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const assignments = await getAssignments() || {};
      const customServices = await getCustomServices() || {};
      const manualAgentsMap = await getManualAgents() || {};
      const activeGrup = await getSelectedGrup() || 4;
      const officialAgents = await getAgents(activeGrup) || [];

      const dates = Object.keys(assignments).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      if (dates.length === 0) {
        setExporting(false);
        return Alert.alert("Sense dades", "No hi ha cap planificació per exportar.");
      }

      const wb = XLSX.utils.book_new();
      const wsData = [];
      const merges = [];

      wsData.push(["QUADRANT SETMANAL - ESCAMOT " + activeGrup]);
      merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
      wsData.push([]);

      const firstDate = new Date(dates[0]);
      const lastDate = new Date(dates[dates.length - 1]);

      let current = new Date(firstDate);
      const day = current.getDay();
      const diff = current.getDate() - day + (day === 0 ? -6 : 1);
      current = new Date(current.setDate(diff));

      const ALL_BASE_SVS = [
        { id: 'GAUDI_110', name: 'GAUDI 110' }, { id: 'GAUDI_111', name: 'GAUDI 111' },
        { id: 'GAUDI_120', name: 'GAUDI 120' }, { id: 'GAUDI_121', name: 'GAUDI 121' },
        { id: 'GAUDI_130', name: 'GAUDI 130' }, { id: 'GAUDI_131', name: 'GAUDI 131' },
        { id: 'GAUDI_140', name: 'GAUDI 140' }, { id: 'GAUDI_141', name: 'GAUDI 141' },
        { id: 'GAUDI_ORDRES', name: 'GAUDI ORDRES' }, { id: '2010', name: '2010' }, { id: '2011', name: '2011' },
        { id: 'OAC_BARCELONETA', name: 'OAC BARCELONETA' }, { id: 'OAC', name: 'OAC' },
        { id: 'IAD', name: 'INSTRUCCI\u00d3' }, { id: 'ACD', name: 'CUST\u00d2DIA' },
        { id: 'SEGURETAT', name: 'SEGURETAT' }, { id: 'INCIDENCIES', name: 'INCID\u00c8NCIES' }
      ];

      while (current <= lastDate) {
        const weekEnd = new Date(current);
        weekEnd.setDate(current.getDate() + 6);

        const startDateStr = current.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const endDateStr = weekEnd.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

        let turnLabel = "FESTA";
        for (let j = 0; j < 7; j++) {
          const dj = new Date(current);
          dj.setDate(current.getDate() + j);
          const tk = getTurnForDate(dj, activeGrup);
          if (tk && tk !== 'F') {
            turnLabel = tk === 'M' ? 'MATÍ' : tk === 'T' ? 'TARDA' : 'NIT';
            break;
          }
        }

        const headerText = `SETMANA (${turnLabel}) DEL ${startDateStr} AL ${endDateStr}`;
        const currentRow = wsData.length;
        wsData.push([headerText]);
        merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 8 } });

        const weekHeader = ["TIP", "NOM"];
        const dayKeys = [];

        for (let i = 0; i < 7; i++) {
          const d = new Date(current);
          d.setDate(current.getDate() + i);
          const dayName = d.toLocaleDateString('ca-ES', { weekday: 'short' }).toUpperCase();
          const dateSimple = d.toLocaleDateString('ca-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
          weekHeader.push(`${dayName} ${dateSimple}`);
          dayKeys.push(d.toDateString());
        }

        wsData.push(weekHeader);

        const weekTips = new Set();
        officialAgents.forEach(a => weekTips.add(String(a.tip)));

        dayKeys.forEach(dk => {
          const dayAssigns = assignments[dk] || {};
          Object.keys(dayAssigns).forEach(srvId => {
            if (srvId.startsWith('MANDO_')) weekTips.add(srvId.replace('MANDO_', ''));
            const tips = dayAssigns[srvId];
            if (Array.isArray(tips)) {
              tips.forEach(t => { if (t) weekTips.add(String(t)); });
            }
          });
        });

        const sortedTips = Array.from(weekTips).sort((a, b) => {
          const agentA = officialAgents.find(ag => String(ag.tip) === a);
          const agentB = officialAgents.find(ag => String(ag.tip) === b);
          if (agentA && !agentB) return -1;
          if (!agentA && agentB) return 1;
          return String(a).localeCompare(String(b));
        });

        sortedTips.forEach(tip => {
          const officialInfo = officialAgents.find(a => String(a.tip) === tip);
          const name = officialInfo ? officialInfo.nom : (manualAgentsMap[tip] || "Agent Manual");
          const row = [tip, name];

          dayKeys.forEach(dk => {
            const dayAssigns = assignments[dk] || {};
            const dayCustom = customServices[dk] || [];
            let serviceFound = "-";

            const mKeys = Object.keys(dayAssigns).filter(k => k.startsWith('MANDO_'));
            for (const mk of mKeys) {
              const mandoTip = mk.replace('MANDO_', '');
              if (mandoTip === tip || (Array.isArray(dayAssigns[mk]) && dayAssigns[mk].includes(tip))) {
                const allMandos = officialAgents
                  .filter(a => a.categoria === 'SERGENT' || a.categoria === 'CAPORAL')
                  .sort((a, b) => {
                    if (a.categoria === 'SERGENT' && b.categoria !== 'SERGENT') return -1;
                    if (a.categoria !== 'SERGENT' && b.categoria === 'SERGENT') return 1;
                    return (a.createdAt || 0) - (b.createdAt || 0);
                  });
                const mIndex = allMandos.findIndex(m => String(m.tip) === mandoTip);
                serviceFound = (mIndex !== -1) ? (mIndex === 0 ? "GAUDI 100" : `GAUDI 10${mIndex}`) : "MANDO";
                break;
              }
            }

            if (serviceFound === "-") {
              for (const srv of ALL_BASE_SVS) {
                if (Array.isArray(dayAssigns[srv.id]) && dayAssigns[srv.id].includes(tip)) {
                  serviceFound = srv.name;
                  break;
                }
                if (Array.isArray(dayAssigns[srv.id + "_RESP"]) && dayAssigns[srv.id + "_RESP"].includes(tip)) {
                  serviceFound = `${srv.name} (R)`;
                  break;
                }
              }
            }

            if (serviceFound === "-") {
              const customSrv = dayCustom.find(cs => Array.isArray(dayAssigns[cs.id]) && dayAssigns[cs.id].includes(tip));
              if (customSrv) serviceFound = customSrv.id;
            }

            row.push(serviceFound);
          });
          wsData.push(row);
        });

        wsData.push([]); wsData.push([]); wsData.push([]); wsData.push([]); wsData.push([]);
        current.setDate(current.getDate() + 7);
      }

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!merges'] = merges;
      ws['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];

      XLSX.utils.book_append_sheet(wb, ws, "HISTORIAL");
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const uri = FileSystem.cacheDirectory + `Quadrant_Historial_Esc${activeGrup}.xlsx`;

      await FileSystem.writeAsStringAsync(uri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Exportar Quadrant Excel' });

    } catch (error) {
      console.error(error);
      Alert.alert("Error de Tipus", "S'ha produït un error en processar les dades. Revisa que totes les planificacions estiguin guardades correctament.\n\nDetall: " + error.message);
    }
    setExporting(false);
  };

  const handleResetAgents = () => {
    Alert.alert(
      "Reiniciar Agents",
      "Vols carregar la llista nova d'agents? Això esborrarà la llista actual i carregarà els 44 agents nous al Escamot 4.",
      [
        { text: "Cancel·lar", style: "cancel" },
        {
          text: "Reiniciar",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("@agents_list_v2");
              await AsyncStorage.removeItem("@selected_grup_v1");
              Alert.alert("Fet", "Reinicia l'aplicació o canvia de pestanya per veure els canvis.");
            } catch (e) {
              Alert.alert("Error", "No s'han pogut borrar les dades.");
            }
          }
        }
      ]
    );
  };

  const handleClearAllPermissions = () => {
    Alert.alert(
      "Eliminar Tots els Permisos",
      "Vols eliminar TOTS els permisos creats (JUDICI, PERLLONGAMENT, VACANCES, BAIXES, etc.)? Aquesta acció NO es pot desfer.",
      [
        { text: "Cancel·lar", style: "cancel" },
        {
          text: "Eliminar Tot",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("@calendar_notes_v1");
              await AsyncStorage.removeItem("@alerts_v1");
              Alert.alert("Fet", "Tots els permisos han estat eliminats correctament. Reinicia l'aplicació o canvia de pestanya per veure els canvis.");
            } catch (e) {
              Alert.alert("Error", "No s'han pogut eliminar les dades.");
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuració</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {Platform.OS !== 'web' ? (
          <>
            <TouchableOpacity
              style={[styles.exportBtn, exporting && { opacity: 0.7 }]}
              onPress={handleExportExcel}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.exportBtnText}>📊 EXPORTAR HISTORIAL A EXCEL</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: COLORS.PRIMARY, marginTop: 15 }]}
              onPress={() => openEmailModal("QUADRANT")}
            >
              <Text style={styles.exportBtnText}>📧 CORREUS QUADRANT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: COLORS.PRIMARY, marginTop: 15 }]}
              onPress={() => openEmailModal("PERLL")}
            >
              <Text style={styles.exportBtnText}>📧 CORREUS PERLLONGAMENTS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: '#FBC02D', marginTop: 15 }]}
              onPress={() => setRulesModalVisible(true)}
            >
              <Text style={styles.exportBtnText}>⚡ PERLLONGAMENTS AUTOMÀTICS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, { backgroundColor: '#616161', marginTop: 15 }]}
              onPress={handleLogout}
            >
              <Text style={styles.exportBtnText}>🚪 TANCAR SESSIÓ ADMIN</Text>
            </TouchableOpacity>

            <Modal visible={emailModalVisible} animationType="slide" transparent={true}>
              <View style={styles.centeredModalOverlay}>
                <View style={[styles.emailModalContent, { height: '80%', width: '90%' }]}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>
                      {emailCategory === "QUADRANT" ? "Correus Quadrant" : "Correus Perllongaments"}
                    </Text>
                    <TouchableOpacity onPress={() => setEmailModalVisible(false)} style={styles.closeBtn}>
                      <Text style={styles.closeBtnText}>TANCAR</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalSubtitle}>
                    {emailCategory === "QUADRANT"
                      ? "Afegeix els correus on s'enviará el quadrant."
                      : "Afegeix els correus on s'enviaràn els perllongaments."}
                  </Text>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: caporal@exemple.com"
                      placeholderTextColor="#999"
                      value={emailInput}
                      onChangeText={setEmailInput}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddEmail}>
                      <Text style={styles.addBtnText}>AFEGIR</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.emailListScroll}>
                    {(emailCategory === "QUADRANT" ? emailListQuad : emailListPerll).length === 0 ? (
                      <Text style={styles.emptyText}>No hi ha cap correu configurat.</Text>
                    ) : (
                      (emailCategory === "QUADRANT" ? emailListQuad : emailListPerll).map((email, index) => (
                        <View key={index} style={styles.emailItemRow}>
                          <Text style={styles.emailTextItem}>{email}</Text>
                          <TouchableOpacity onPress={() => removeEmail(email)}>
                            <Text style={styles.deleteTextItem}>ELIMINAR</Text>
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>

            <Modal visible={rulesModalVisible} animationType="slide" transparent={true}>
              <View style={styles.centeredModalOverlay}>
                <View style={[styles.emailModalContent, { height: '85%', width: '95%' }]}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>Regles Automàtiques</Text>
                    <TouchableOpacity onPress={() => setRulesModalVisible(false)} style={styles.closeBtn}>
                      <Text style={styles.closeBtnText}>TANCAR</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalSubtitle}>Configura els motius i temps que es generen al polsar la varita màgica.</Text>

                  <ScrollView style={{ flex: 1 }}>
                    {autoPerlRules.map((rule) => (
                      <View key={rule.id} style={styles.ruleCard}>
                        <Text style={styles.ruleLabel}>{rule.label}</Text>
                        <View style={{ marginBottom: 10 }}>
                          <Text style={styles.inputLabel}>MOTIU:</Text>
                          <TextInput
                            style={styles.ruleInput}
                            value={rule.motiu}
                            onChangeText={(val) => handleUpdateRule(rule.id, 'motiu', val)}
                          />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={styles.inputLabel}>ANTICIP. (MIN):</Text>
                            <TextInput
                              style={styles.ruleInput}
                              keyboardType="numeric"
                              value={String(rule.anticipament)}
                              onChangeText={(val) => handleUpdateRule(rule.id, 'anticipament', parseInt(val) || 0)}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>PERLL. (MIN):</Text>
                            <TextInput
                              style={styles.ruleInput}
                              keyboardType="numeric"
                              value={String(rule.perllongament)}
                              onChangeText={(val) => handleUpdateRule(rule.id, 'perllongament', parseInt(val) || 0)}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                    <View style={{ height: 30 }} />
                  </ScrollView>
                </View>
              </View>
            </Modal>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardIcon}>💻</Text>
            <Text style={styles.cardTitle}>Versió Web</Text>
            <Text style={styles.cardText}>
              L'exportació i gestió de correus només està disponible a l'aplicació mòbil (Android/iOS).
            </Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.PRIMARY,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  exportBtn: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  exportBtnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 24,
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailModalContent: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.PRIMARY,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#F0F2F5',
    borderRadius: 12,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 25,
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E0E4E8',
  },
  addBtn: {
    backgroundColor: COLORS.GAUDI,
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  addBtnText: {
    color: 'white',
    fontWeight: '900',
    fontSize: 13,
  },
  emailListScroll: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F5',
    paddingTop: 10,
  },
  emailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  emailTextItem: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
  },
  deleteTextItem: {
    color: '#FF5252',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 40,
  },
  ruleCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E4E8',
  },
  ruleLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: COLORS.PRIMARY,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#888',
    marginBottom: 4,
  },
  ruleInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E4E8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
});
