import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { useState } from "react";
import { COLORS } from "../theme/colors";
import AgentDetailScreen from "./AgentDetailScreen";

export default function AgentsScreen({ session, setSession, agents, setAgents, isAddingAgent, setIsAddingAgent, activeGrupProp }) {
  const [selected, setSelected] = useState(null);

  // 🔹 Si pulsamos el "+" en MainContainer, abrimos ficha en blanco
  if (isAddingAgent) {
    return (
      <AgentDetailScreen
        agent={null}
        session={session}
        goBack={() => setIsAddingAgent(false)}
        onSaveNew={(newAgent) => {
          setAgents([...agents, newAgent]);
          setIsAddingAgent(false);
        }}
      />
    );
  }

  // 🔹 Ficha de agente existente
  if (selected) {
    return (
      <AgentDetailScreen
        agent={selected}
        session={session}
        goBack={() => setSelected(null)}
        onUpdateAgent={(updated) => {
          const updatedList = agents.map(a => a.tip === updated.tip ? updated : a);
          setAgents(updatedList);
        }}
        onDeleteAgent={(tip) => {
          const updatedList = agents.filter(a => a.tip !== tip);
          setAgents(updatedList);
        }}
      />
    );
  }

  // 🔹 Ordenar agentes: Sergent > Caporal > Agent
  const categoryOrder = { "SERGENT": 0, "CAPORAL": 1, "AGENT": 2 };

  const sortedAgents = [...agents].sort((a, b) => {
    const orderA = categoryOrder[a.categoria] ?? 2;
    const orderB = categoryOrder[b.categoria] ?? 2;

    if (orderA !== orderB) return orderA - orderB;

    // Si son la misma categoría, ordenamos por orden de creación (antigüedad)
    const timeA = a.createdAt ?? 0;
    const timeB = b.createdAt ?? 0;
    return timeA - timeB;
  });

  // 🔹 Agrupar y ordenar para las secciones
  const sections = [
    { title: "Sergent/a", data: sortedAgents.filter(a => a.categoria === "SERGENT") },
    { title: "Caporal/a", data: sortedAgents.filter(a => a.categoria === "CAPORAL") },
    { title: "Agents", data: sortedAgents.filter(a => a.categoria === "AGENT") },
  ];

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 40 }}>
      {/* CABECERA */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '900', color: COLORS.PRIMARY }}>
          ESCAMOT {activeGrupProp}
        </Text>
      </View>

      {/* LISTA POR SECCIONES */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {sections.map((section, idx) => (
          section.data.length > 0 && (
            <View key={idx} style={{ marginBottom: 25 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: 'bold',
                color: '#888',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: 1
              }}>
                {section.title}
              </Text>

              <View style={{ backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                {section.data.map((item, index) => (
                  <TouchableOpacity
                    key={item.tip}
                    onPress={() => setSelected(item)}
                    style={{
                      padding: 16,
                      borderBottomWidth: index === section.data.length - 1 ? 0 : 1,
                      borderColor: '#F0F0F0',
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 33,
                        height: 44,
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: COLORS.PRIMARY,
                        marginRight: 12,
                        overflow: 'hidden',
                        backgroundColor: '#F5F5F7',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {item.photo ? (
                          <Image source={{ uri: item.photo }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Image
                            source={require('../../assets/logo.png')}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: '#333' }}>
                        {item.tip} — {item.nom}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 18, color: '#CCC' }}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}
