import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image, StyleSheet } from "react-native";
import { useState, useEffect } from "react";
import { COLORS } from "../theme/colors";
import { getAgents, getAgentDetail, saveSelectedGrup } from "../services/database";
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen({ setSession }) {
  const [email, setEmail] = useState("");
  const [tip, setTip] = useState("");
  const [password, setPassword] = useState(""); // Para el administrador
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const enabled = await AsyncStorage.getItem("@biometric_enabled");
        const countStr = await AsyncStorage.getItem("@biometric_count") || "0";
        const count = parseInt(countStr);
        const savedUser = await AsyncStorage.getItem("@biometric_user");

        if (enabled === "true" && savedUser && count < 15) {
          try {
            const userData = JSON.parse(savedUser);
            if (userData && userData.tip && userData.email) {
              handleBiometricLogin(userData);
            }
          } catch (e) {
            console.error("Biometric data corrupted", e);
          }
        } else if (count >= 15) {
          Alert.alert("Seguretat", "Has excedit els 15 accessos biomètrics. Per seguretat, aquesta vegada has d'entrar manualment.");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleBiometricLogin = async (savedUser) => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Accés Biomètric',
      fallbackLabel: 'Utilitzar manual',
    });

    if (result.success) {
      setLoading(true);
      try {
        const count = await AsyncStorage.getItem("@biometric_count") || "0";
        await AsyncStorage.setItem("@biometric_count", String(parseInt(count) + 1));

        // Simular el procés de login per obtenir el grup actualitzat
        await performLogin(savedUser.email, savedUser.tip, true);
      } finally {
        setLoading(false);
      }
    }
  };

  const performLogin = async (userEmail, userTip, isBiometric = false) => {
    let userFound = null;
    let userGrup = null;

    for (let g = 1; g <= 5; g++) {
      const agents = await getAgents(g);
      const match = agents.find(a => String(a.tip).trim() === String(userTip).trim());

      if (match) {
        const detail = await getAgentDetail(match.tip);
        if (detail && detail.email?.toLowerCase().trim() === userEmail.toLowerCase().trim()) {
          userFound = { ...match, ...detail };
          userGrup = g;
          break;
        }
      }
    }

    if (userFound) {
      await saveSelectedGrup(userGrup);

      if (!isBiometric) {
        // Si el login ha estat manual, resetejem el contador i preguntem si volen biomètric
        await AsyncStorage.setItem("@biometric_count", "0");
        const biometricSetup = await AsyncStorage.getItem("@biometric_enabled");
        if (!biometricSetup) {
          askForBiometrics(userEmail, userTip);
        }
      }

      setSession({
        perfil: "USUARI",
        user: userFound,
        grup: userGrup
      });
      return true;
    } else {
      if (!isBiometric) Alert.alert("Error", "Les dades no coincideixen amb cap agent registrat.");
      return false;
    }
  };

  const askForBiometrics = async (userEmail, userTip) => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      Alert.alert(
        "Accés Biomètric",
        "Vols activar l'accés amb empremta o cara per a la propera vegada?",
        [
          { text: "No", style: "cancel", onPress: async () => await AsyncStorage.setItem("@biometric_enabled", "false") },
          {
            text: "Sí",
            onPress: async () => {
              await AsyncStorage.setItem("@biometric_enabled", "true");
              await AsyncStorage.setItem("@biometric_user", JSON.stringify({ email: userEmail, tip: userTip }));
              await AsyncStorage.setItem("@biometric_count", "0");
              Alert.alert("Activat", "Accés biomètric activat correctament.");
            }
          }
        ]
      );
    }
  };

  const handleLogin = async () => {
    // Caso 1: Login de Administrador
    if (showAdmin) {
      const adminPasswords = {
        "19531": 1,
        "19532": 2,
        "19533": 3,
        "19538": 4,
        "19535": 5
      };

      if (adminPasswords[password]) {
        const grup = adminPasswords[password];
        await saveSelectedGrup(grup);
        setSession({ perfil: "ADMIN", grup: grup });
        return;
      } else {
        Alert.alert("Error", "Contrasenya d'administrador incorrecta");
        return;
      }
    }

    // Caso 2: Login de Usuari (Email + TIP)
    if (!email || !tip) {
      Alert.alert("Atenció", "Introdueix el teu Email i TIP");
      return;
    }

    setLoading(true);
    try {
      await performLogin(email, tip, false);
    } catch (error) {
      Alert.alert("Error", "Hi ha hagut un problema en l'inici de sessió");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: '#121212' }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 32, paddingTop: 80, alignItems: 'center' }}>
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={{ width: '100%', marginBottom: 40 }}>
          <Text style={styles.title}>
            Benvingut
          </Text>
          <Text style={styles.subtitle}>
            Inicia sessió per gestionar el teu quadrant
          </Text>
        </View>

        <View style={{ width: '100%' }}>
          {!showAdmin ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>EMAIL</Text>
                <TextInput
                  placeholder="exemple@exemple.cat"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>NÚMERO DE TIP</Text>
                <TextInput
                  placeholder="Ex: 12345"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={tip}
                  onChangeText={setTip}
                  style={styles.input}
                />
              </View>
            </>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>CONTRASENYA ADMINISTRADOR</Text>
              <TextInput
                placeholder="••••••"
                placeholderTextColor="#666"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
            </View>
          )}

          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={styles.loginButton}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>
                {showAdmin ? "ENTRAR COM A ADMINISTRADOR" : "ENTRAR A LA MEVA FITXA"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowAdmin(!showAdmin)}
            style={styles.switchButton}
          >
            <Text style={styles.switchButtonText}>
              {showAdmin ? "Torna al login d'usuari" : "Ets administrador?"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 40,
  },
  logo: {
    width: 220,
    height: 220,
    borderRadius: 110, // Circular if possible, or matches image shape
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 1
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0A0',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#888',
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 1.5
  },
  input: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    padding: 18,
    borderRadius: 15,
    fontSize: 16,
    color: '#FFF',
  },
  loginButton: {
    backgroundColor: COLORS.PRIMARY || '#007AFF',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.PRIMARY || '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8
  },
  loginButtonText: {
    color: "white",
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1
  },
  switchButton: {
    marginTop: 30,
    alignSelf: 'center',
    padding: 10
  },
  switchButtonText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 14,
    textDecorationLine: 'underline'
  }
});

