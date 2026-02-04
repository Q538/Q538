/**
 * Script de Migración: AsyncStorage → Supabase
 * 
 * Este script te ayuda a migrar todos los datos existentes
 * de AsyncStorage a Supabase.
 * 
 * IMPORTANTE: Ejecuta este script SOLO UNA VEZ después de
 * configurar Supabase correctamente.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const migrateToSupabase = async () => {
    console.log('🚀 Iniciando migración a Supabase...');

    try {
        // 1. Migrar Agentes
        console.log('📋 Migrando agentes...');
        const agentsKey = '@agents_list_v2';
        const agentsData = await AsyncStorage.getItem(agentsKey);

        if (agentsData) {
            const agents = JSON.parse(agentsData);
            const agentsWithGrup = agents.map((agent, index) => ({
                grup: 4,
                tip: agent.tip,
                nom: agent.nom,
                categoria: agent.categoria,
                email: agent.email || null,
                funcions: agent.funcions || [],
                created_at: new Date(Date.now() + index).toISOString(),
            }));

            const { error } = await supabase.from('agents').upsert(agentsWithGrup);
            if (error) throw error;
            console.log(`✅ ${agents.length} agentes migrados`);
        }

        // 2. Migrar Notas del Calendario
        console.log('📅 Migrando notas del calendario...');
        const notesKey = '@calendar_notes_v1';
        const notesData = await AsyncStorage.getItem(notesKey);

        if (notesData) {
            const notes = JSON.parse(notesData);
            const notesArray = [];

            Object.keys(notes).forEach(dateKey => {
                Object.keys(notes[dateKey]).forEach(tip => {
                    const noteData = notes[dateKey][tip];
                    notesArray.push({
                        date_key: dateKey,
                        tip: tip,
                        statuses: noteData.statuses || [],
                        note: noteData.note || null,
                        full_day: noteData.fullDay || false,
                        partial: noteData.partial || null,
                        modified_by_admin: noteData.modifiedByAdmin || false,
                        perllongament: noteData.perllongament || null,
                        judici: noteData.judici || null,
                        permis: noteData.permis || null,
                        ap: noteData.ap || null,
                        altres: noteData.altres || null,
                        range_data: noteData.range || null,
                    });
                });
            });

            if (notesArray.length > 0) {
                const { error } = await supabase
                    .from('calendar_notes')
                    .upsert(notesArray, { onConflict: 'date_key,tip' });
                if (error) throw error;
                console.log(`✅ ${notesArray.length} notas migradas`);
            }
        }

        // 3. Migrar Alertas
        console.log('🔔 Migrando alertas...');
        const alertsKey = '@alerts_v1';
        const alertsData = await AsyncStorage.getItem(alertsKey);

        if (alertsData) {
            const alerts = JSON.parse(alertsData);
            const alertsArray = alerts.map(alert => ({
                tip: alert.tip,
                message: alert.message,
                date: alert.date ? new Date(alert.date).toISOString() : null,
                read: alert.read || false,
            }));

            if (alertsArray.length > 0) {
                const { error } = await supabase.from('alerts').insert(alertsArray);
                if (error) throw error;
                console.log(`✅ ${alertsArray.length} alertas migradas`);
            }
        }

        // 4. Migrar Asignaciones
        console.log('📊 Migrando asignaciones...');
        const assignmentsKey = '@assignments_v1';
        const assignmentsData = await AsyncStorage.getItem(assignmentsKey);

        if (assignmentsData) {
            const assignments = JSON.parse(assignmentsData);
            const assignmentsArray = [];

            Object.keys(assignments).forEach(dateKey => {
                Object.keys(assignments[dateKey]).forEach(serviceId => {
                    assignmentsArray.push({
                        grup: 4,
                        date_key: dateKey,
                        service_id: serviceId,
                        tips: assignments[dateKey][serviceId] || [],
                    });
                });
            });

            if (assignmentsArray.length > 0) {
                const { error } = await supabase
                    .from('assignments')
                    .upsert(assignmentsArray, { onConflict: 'grup,date_key,service_id' });
                if (error) throw error;
                console.log(`✅ ${assignmentsArray.length} asignaciones migradas`);
            }
        }

        console.log('🎉 ¡Migración completada con éxito!');
        return { success: true, message: 'Migración completada' };

    } catch (error) {
        console.error('❌ Error en la migración:', error);
        return { success: false, error: error.message };
    }
};

// Función para verificar la conexión con Supabase
export const testSupabaseConnection = async () => {
    try {
        const { data, error } = await supabase.from('agents').select('count');
        if (error) throw error;
        console.log('✅ Conexión con Supabase exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión con Supabase:', error);
        return false;
    }
};
