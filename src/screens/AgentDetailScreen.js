import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Image,
} from "react-native";
import { useState, useEffect } from "react";
import { getAgentDetail, saveAgentDetail, deleteAgentDetail } from "../services/database";
import { Picker } from "@react-native-picker/picker";
import { COLORS } from "../theme/colors";
import * as ImagePicker from 'expo-image-picker';

export default function AgentDetailScreen({ agent, goBack, session, onSaveNew, onUpdateAgent, onDeleteAgent }) {
  if (!session) return null;

  const isAdmin = session.perfil === "ADMIN";
  const isNew = !agent?.tip; // Si no hay TIP, es un agente nuevo

  const [tip, setTip] = useState(agent?.tip || "");
  const [nom, setNom] = useState(agent?.nom || "");
  const [sexe, setSexe] = useState("HOME");
  const [email, setEmail] = useState("");
  const [categoria, setCategoria] = useState(agent?.categoria || "AGENT");
  const [prelacio, setPrelacio] = useState(agent?.prelacio || 99);
  const [photo, setPhoto] = useState(null);

  const [funcions, setFuncions] = useState({
    GAUDI: false,
    PAISA: false,
    IAD: false,
    OAC: false,
    OAC_RESP: false,
    OAC_BARCELONETA: false,
    ACD: false,
    SEGURETAT: false,
    INCIDENCIES: false,
  });

  const [passwordPromptVisible, setPasswordPromptVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [onPasswordSuccess, setOnPasswordSuccess] = useState(null);

  // 🔹 CARGAR DATOS (Solo si no es nuevo)
  useEffect(() => {
    if (isNew) return;
    const loadData = async () => {
      const saved = await getAgentDetail(agent.tip);
      if (saved) {
        if (saved.nom) setNom(saved.nom);
        if (saved.sexe) setSexe(saved.sexe);
        if (saved.email) setEmail(saved.email);
        if (saved.categoria) setCategoria(saved.categoria);
        if (saved.prelacio !== undefined) setPrelacio(saved.prelacio);
        if (saved.funcions) {
          setFuncions(prev => ({ ...prev, ...saved.funcions }));
        }
        if (saved.photo) setPhoto(saved.photo);
      }
    };
    loadData();
  }, [agent?.tip]);

  // 🔹 GUARDAR DATOS
  const saveData = async (newData = {}) => {
    if (isNew) return; // Si es nuevo, guardamos todo al final con el botón "Guardar"
    const current = {
      nom,
      sexe,
      email,
      categoria,
      prelacio,
      funcions,
      photo,
      ...newData,
    };
    await saveAgentDetail(agent.tip, current);
  };

  const handleCreateAgent = async () => {
    if (!tip || !nom) {
      Alert.alert("Error", "El TIP i el Nom són obligatoris.");
      return;
    }

    const newAgentData = {
      tip,
      nom,
      sexe,
      email,
      categoria,
      prelacio,
      funcions,
      photo,
      createdAt: Date.now()
    };

    // Guardar detalles especificos
    await saveAgentDetail(tip, newAgentData);

    // Guardar en la lista global
    onSaveNew({ tip, nom, categoria, prelacio, photo, createdAt: newAgentData.createdAt });
    goBack();
  };

  const toggle = (key) => {
    if (!isAdmin) return;
    const updated = { ...funcions, [key]: !funcions[key] };
    setFuncions(updated);
    if (!isNew) saveData({ funcions: updated });
  };

  const changeNom = (value) => {
    if (!isAdmin) return;
    setNom(value);
    if (!isNew) {
      saveData({ nom: value });
      // Si tenemos la función de actualización, la llamamos para refrescar la lista
      if (onUpdateAgent) onUpdateAgent({ ...agent, nom: value });
    }
  };

  const changePrelacio = (value) => {
    if (!isAdmin) return;
    const num = parseInt(value) || 0;
    setPrelacio(num);
    if (!isNew) {
      saveData({ prelacio: num });
      if (onUpdateAgent) onUpdateAgent({ ...agent, prelacio: num });
    }
  };

  const changeSexe = (value) => {
    if (!isAdmin) return;
    setSexe(value);
    if (!isNew) saveData({ sexe: value });
  };

  const changeEmail = (value) => {
    setEmail(value);
    if (!isNew) saveData({ email: value });
  };

  const changeCategoria = (value) => {
    if (!isAdmin) return;
    setCategoria(value);
    if (!isNew) {
      saveData({ categoria: value });
      if (onUpdateAgent) onUpdateAgent({ ...agent, categoria: value });
    }
  };

  const handlePhotoPress = async () => {
    // Solo el Admin o el propio usuario pueden editar su foto
    const isSelf = String(session?.user?.tip) === String(agent?.tip || tip);
    if (!isAdmin && !isSelf) {
      Alert.alert("Accés Denegat", "Només l'administrador o tu mateix podeu canviar la foto.");
      return;
    }

    Alert.alert(
      "Foto de Perfil",
      "Selecciona una opció:",
      [
        {
          text: "Afegir",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [3, 4],
              quality: 0.5,
              base64: true,
            });

            if (!result.canceled) {
              const base64Photo = `data:image/jpeg;base64,${result.assets[0].base64}`;
              setPhoto(base64Photo);
              if (!isNew) {
                saveData({ photo: base64Photo });
                if (onUpdateAgent) onUpdateAgent({ ...agent, photo: base64Photo, nom });
              }
            }
          }
        },
        {
          text: "Esborrar Foto",
          style: "destructive",
          onPress: () => {
            setPhoto(null);
            if (!isNew) {
              saveData({ photo: null });
              if (onUpdateAgent) onUpdateAgent({ ...agent, photo: null, nom });
            }
          }
        },
        { text: "Cancel·lar", style: "cancel" }
      ]
    );
  };

  const confirmPassword = () => {
    if (passwordInput === "19538") {
      setPasswordPromptVisible(false);
      if (onPasswordSuccess) onPasswordSuccess();
    } else {
      Alert.alert("Error", "Contrasenya incorrecta");
    }
  };

  const Btn = ({ text, keyName, color, active, hasExtra, extraLabel, extraActive, extraKey }) => (
    <View style={{
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    }}>
      {/* Etiqueta Principal */}
      <TouchableOpacity
        onPress={isAdmin ? () => toggle(keyName) : undefined}
        disabled={!isAdmin}
        activeOpacity={0.7}
        style={{
          flex: 1,
          backgroundColor: active ? color : "#F5F5F7",
          borderRadius: 10,
          borderWidth: active ? 0 : 1.5,
          borderColor: active ? color : '#E1E1E4',
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 15,
          height: 48,
          // Sombra sutil
          shadowColor: active ? color : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: active ? 0.3 : 0.05,
          shadowRadius: 4,
          elevation: 2,
          marginRight: hasExtra ? 8 : 0
        }}
      >
        <View style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: active ? 'white' : color,
          marginRight: 12
        }} />
        <Text style={{
          fontSize: 15,
          fontWeight: '700',
          color: active ? 'white' : '#444',
          flex: 1
        }}>
          {text}
        </Text>
        {active && <Text style={{ color: 'white', fontWeight: 'bold' }}>✓</Text>}
      </TouchableOpacity>

      {/* Selector de Responsable (Botón compacto lateral) */}
      {hasExtra && (
        <TouchableOpacity
          onPress={isAdmin ? () => toggle(extraKey) : undefined}
          activeOpacity={0.7}
          style={{
            backgroundColor: extraActive ? color : '#F5F5F7',
            height: 48,
            paddingHorizontal: 12,
            borderRadius: 10,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: extraActive ? 0 : 1.5,
            borderColor: extraActive ? color : '#E1E1E4',
            minWidth: 70,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
          }}
        >
          <Text style={{
            fontSize: 10,
            fontWeight: '900',
            color: extraActive ? 'white' : '#777',
          }}>
            {extraLabel}
          </Text>
          <Text style={{
            fontSize: 9,
            color: extraActive ? 'white' : '#999',
            fontWeight: 'bold',
            marginTop: 1
          }}>
            {extraActive ? 'ACTIU' : 'NO ACTIU'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const SexeBtn = ({ label, value }) => {
    const isHome = value === "HOME";
    const isActive = sexe === value;

    // Colores solicitados: Azul más claro para hombre, Rojo claro para mujer
    const activeColor = isHome ? "#BBDEFB" : "#FFCDD2";
    const textColor = isActive ? (isHome ? "#1976D2" : "#D32F2F") : "#666";

    return (
      <TouchableOpacity
        onPress={isAdmin ? () => changeSexe(value) : undefined}
        disabled={!isAdmin}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 20,
          borderRadius: 12,
          marginRight: 10,
          backgroundColor: isActive ? activeColor : "#F5F5F7",
          borderWidth: 1.5,
          borderColor: isActive ? activeColor : "#E1E1E4",
          minWidth: 90,
          alignItems: 'center',
          opacity: isAdmin ? 1 : 0.6,
          elevation: isActive ? 2 : 0,
        }}
      >
        <Text style={{
          color: textColor,
          fontWeight: 'bold',
          fontSize: 14
        }}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
      {/* Tornar */}
      <TouchableOpacity onPress={goBack} style={{ marginTop: 40, marginBottom: 16 }}>
        <Text style={{ color: COLORS.PRIMARY, fontWeight: '600' }}>← Tornar</Text>
      </TouchableOpacity>

      {/* CABECERA: DADES I FOTO A LA DRETA */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, marginTop: 10 }}>
        <View style={{ flex: 1, marginRight: 20 }}>
          {/* TIP */}
          <View style={{ marginBottom: 15 }}>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 4, fontWeight: 'bold' }}>TIP</Text>
            {isNew ? (
              <TextInput
                value={tip}
                onChangeText={setTip}
                placeholder="Ex: 12345"
                keyboardType="numeric"
                style={styles.input}
              />
            ) : (
              <Text style={{ fontSize: 32, fontWeight: "900", color: COLORS.PRIMARY }}>{agent.tip}</Text>
            )}
          </View>

          {/* NOM */}
          <View>
            <Text style={{ fontSize: 12, color: '#666', marginBottom: 4, fontWeight: 'bold' }}>NOM</Text>
            <TextInput
              value={nom}
              onChangeText={changeNom}
              editable={isAdmin}
              placeholder="Nom complet"
              style={[styles.input, { fontSize: 16, height: 45 }]}
            />
          </View>
        </View>

        {/* FOTO GRAN A LA DRETA */}
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={handlePhotoPress}
          activeOpacity={0.8}
        >
          <View style={styles.photoWrapper}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.agentPhoto} />
            ) : (
              <Image
                source={require('../../assets/logo.png')}
                style={styles.agentPhoto}
                resizeMode="cover"
              />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 20 }}>
        <Text style={{ marginBottom: 6 }}>Sexe</Text>
        <View style={{ flexDirection: "row", marginBottom: 10 }}>
          <SexeBtn label="Home" value="HOME" />
          <SexeBtn label="Dona" value="DONA" />
        </View>

        {/* CATEGORIA DESPLEGABLE */}
        <Text style={{ marginBottom: 6 }}>Categoria</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={categoria}
            onValueChange={changeCategoria}
            enabled={isAdmin}
          >
            <Picker.Item label="Agent" value="AGENT" />
            <Picker.Item label="Caporal/a" value="CAPORAL" />
            <Picker.Item label="Sergent/a" value="SERGENT" />
          </Picker>
        </View>
      </View>

      {/* EMAIL */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ marginBottom: 6 }}>Email</Text>
        <TextInput
          value={email}
          onChangeText={changeEmail}
          editable={true}
          placeholder="email@exemple.cat"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
        />
      </View>

      {/* FUNCIONS (Only for Admins) */}
      {isAdmin && (
        <>
          <Text style={{ fontSize: 18, marginBottom: 15, fontWeight: '800', color: '#333' }}>FUNCIONS:</Text>

          {(categoria === "AGENT" || categoria === "CAPORAL" || categoria === "SERGENT") && (
            <Btn text="GAUDÍ" keyName="GAUDI" color={COLORS.GAUDI} active={funcions.GAUDI} />
          )}

          {(categoria === "AGENT" || categoria === "CAPORAL") && (
            <>
              <Btn text="PAISÀ" keyName="PAISA" color="#607D8B" active={funcions.PAISA} />
              <Btn text="IAD" keyName="IAD" color={COLORS.IAD} active={funcions.IAD} />
              <Btn
                text="OAC"
                keyName="OAC"
                color={COLORS.OAC}
                active={funcions.OAC}
                hasExtra={categoria === "AGENT"}
                extraLabel="RESP."
                extraActive={funcions.OAC_RESP}
                extraKey="OAC_RESP"
              />
            </>
          )}

          {categoria === "AGENT" && (
            <>
              <Btn text="OAC BARCELONETA" keyName="OAC_BARCELONETA" color={COLORS.OAC_BARCELONETA} active={funcions.OAC_BARCELONETA} />
              <Btn text="ACD" keyName="ACD" color={COLORS.ACD} active={funcions.ACD} />
              <Btn text="SEGURETAT" keyName="SEGURETAT" color={COLORS.SEGURETAT} active={funcions.SEGURETAT} />
              <Btn text="INCIDÈNCIES" keyName="INCIDENCIES" color={COLORS.INCIDENCIES} active={funcions.INCIDENCIES} />
            </>
          )}
        </>
      )}

      {isNew && (
        <TouchableOpacity
          onPress={handleCreateAgent}
          style={styles.saveBtn}
        >
          <Text style={{ color: '#1B5E20', fontWeight: 'bold', fontSize: 13 }}>CREAR AGENT</Text>
        </TouchableOpacity>
      )}

      {isAdmin && !isNew && (
        <TouchableOpacity
          onPress={() => {
            setPasswordInput("");
            setOnPasswordSuccess(() => () => {
              Alert.alert(
                "Esborrar Agent",
                `Estàs segur que vols esborrar a ${nom}?`,
                [
                  { text: "Cancel·lar", style: "cancel" },
                  {
                    text: "Esborrar",
                    style: "destructive",
                    onPress: async () => {
                      await deleteAgentDetail(agent.tip);
                      onDeleteAgent(agent.tip);
                      goBack();
                    }
                  }
                ]
              );
            });
            setPasswordPromptVisible(true);
          }}
          style={styles.deleteBtn}
        >
          <Text style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 13 }}>ESBORRAR</Text>
        </TouchableOpacity>
      )}

      {/* Modal de Password Administrador */}
      <Modal visible={passwordPromptVisible} transparent animationType="fade">
        <View style={styles.passwordModalOverlay}>
          <View style={styles.passwordModalContent}>
            <Text style={styles.modalTitle}>ACCÉS RESTRINGIT</Text>
            <Text style={styles.passwordModalSubTitle}>Introdueix la contrasenya d'administrador per borrar un agent.</Text>
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
    </ScrollView>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: COLORS.OFF,
    height: 45,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "white",
    fontSize: 16,
    justifyContent: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.OFF,
    borderRadius: 6,
    backgroundColor: "white",
    height: 45,
    justifyContent: "center",
  },
  photoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoWrapper: {
    width: 105,
    height: 140,
    borderRadius: 52,
    borderWidth: 4,
    borderColor: COLORS.PRIMARY,
    padding: 3,
    backgroundColor: 'white',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 28,
    marginBottom: 2
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: '#DDD',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    width: '40%',
  },
  deleteBtn: {
    marginTop: 40,
    backgroundColor: '#DDD',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    width: '40%',
  },
  passwordModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  passwordModalContent: { backgroundColor: 'white', borderRadius: 24, padding: 25, width: '100%', maxWidth: 400, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.PRIMARY, textAlign: 'center', marginBottom: 10 },
  passwordModalSubTitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  passwordInput: { borderWidth: 2, borderColor: '#EEE', borderRadius: 12, padding: 15, fontSize: 20, textAlign: 'center', marginBottom: 20, backgroundColor: '#F9F9FB' },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { flex: 0.48, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }
};
