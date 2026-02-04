import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * DATABASE SERVICE - Supabase Implementation
 * 
 * Este servicio maneja todas las operaciones de base de datos usando Supabase.
 * Mantiene compatibilidad con la estructura anterior de AsyncStorage.
 */

const USE_SUPABASE = true; // Cambiar a true cuando Supabase esté configurado

// --- AGENTS ---

export const getAgents = async (grup = 4) => {
    if (!USE_SUPABASE) {
        // Fallback a AsyncStorage
        const key = `@agents_list_esc${grup}_v2`;
        const saved = await AsyncStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    }

    try {
        const { data, error } = await supabase
            .from('agents')
            .select('*')
            .eq('grup', grup)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting agents:', error);
        return [];
    }
};

export const saveAgents = async (grup = 4, agents) => {
    if (!USE_SUPABASE) {
        const key = `@agents_list_esc${grup}_v2`;
        await AsyncStorage.setItem(key, JSON.stringify(agents));
        return;
    }

    try {
        // Eliminar agentes existentes del grupo
        await supabase.from('agents').delete().eq('grup', grup);

        // Insertar nuevos agentes
        const agentsWithGrup = agents.map((agent, index) => ({
            grup,
            tip: agent.tip,
            nom: agent.nom,
            categoria: agent.categoria,
            email: agent.email || null,
            funcions: agent.funcions || [],
            created_at: new Date(Date.now() + index).toISOString(), // Preservar orden
        }));

        const { error } = await supabase.from('agents').insert(agentsWithGrup);
        if (error) throw error;
    } catch (error) {
        console.error('Error saving agents:', error);
    }
};

// --- CALENDAR NOTES ---

export const getCalendarNotes = async () => {
    if (!USE_SUPABASE) {
        const saved = await AsyncStorage.getItem('@calendar_notes_v1');
        return saved ? JSON.parse(saved) : {};
    }

    try {
        const { data, error } = await supabase
            .from('calendar_notes')
            .select('*');

        if (error) throw error;

        // Convertir array de Supabase a formato de objeto por fecha
        const notes = {};
        data.forEach(note => {
            if (!notes[note.date_key]) {
                notes[note.date_key] = {};
            }
            notes[note.date_key][note.tip] = {
                statuses: note.statuses || [],
                note: note.note,
                fullDay: note.full_day,
                partial: note.partial,
                modifiedByAdmin: note.modified_by_admin,
                perllongament: note.perllongament,
                judici: note.judici,
                permis: note.permis,
                ap: note.ap,
                altres: note.altres,
                range: note.range_data,
            };
        });

        return notes;
    } catch (error) {
        console.error('Error getting calendar notes:', error);
        return {};
    }
};

export const saveCalendarNotes = async (notes) => {
    if (!USE_SUPABASE) {
        await AsyncStorage.setItem('@calendar_notes_v1', JSON.stringify(notes));
        return;
    }

    try {
        // Convertir objeto de notas a array para Supabase
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

        // Usar upsert para insertar o actualizar
        const { error } = await supabase
            .from('calendar_notes')
            .upsert(notesArray, { onConflict: 'date_key,tip' });

        if (error) throw error;
    } catch (error) {
        console.error('Error saving calendar notes:', error);
    }
};

// --- ALERTS ---

export const getAlerts = async () => {
    if (!USE_SUPABASE) {
        const saved = await AsyncStorage.getItem('@alerts_v1');
        return saved ? JSON.parse(saved) : [];
    }

    try {
        const { data, error } = await supabase
            .from('alerts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map(alert => ({
            tip: alert.tip,
            message: alert.message,
            date: alert.date ? new Date(alert.date) : null,
            read: alert.read,
            id: alert.id,
        }));
    } catch (error) {
        console.error('Error getting alerts:', error);
        return [];
    }
};

export const saveAlerts = async (alerts) => {
    if (!USE_SUPABASE) {
        await AsyncStorage.setItem('@alerts_v1', JSON.stringify(alerts));
        return;
    }

    try {
        // Eliminar alertas existentes
        await supabase.from('alerts').delete().neq('id', 0);

        // Insertar nuevas alertas
        const alertsData = alerts.map(alert => ({
            tip: alert.tip,
            message: alert.message,
            date: alert.date ? new Date(alert.date).toISOString() : null,
            read: alert.read || false,
        }));

        const { error } = await supabase.from('alerts').insert(alertsData);
        if (error) throw error;
    } catch (error) {
        console.error('Error saving alerts:', error);
    }
};

// --- ASSIGNMENTS ---

export const getAssignments = async (grup = 4) => {
    if (!USE_SUPABASE) {
        const key = `@assignments_esc${grup}_v1`;
        const saved = await AsyncStorage.getItem(key);
        return saved ? JSON.parse(saved) : {};
    }

    try {
        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .eq('grup', grup);

        if (error) throw error;

        // Convertir array a objeto por fecha
        const assignments = {};
        data.forEach(assignment => {
            if (!assignments[assignment.date_key]) {
                assignments[assignment.date_key] = {};
            }
            assignments[assignment.date_key][assignment.service_id] = assignment.tips || [];
        });

        return assignments;
    } catch (error) {
        console.error('Error getting assignments:', error);
        return {};
    }
};

export const saveAssignments = async (grup = 4, assignments) => {
    if (!USE_SUPABASE) {
        const key = `@assignments_esc${grup}_v1`;
        await AsyncStorage.setItem(key, JSON.stringify(assignments));
        return;
    }

    try {
        // Convertir objeto a array
        const assignmentsArray = [];
        Object.keys(assignments).forEach(dateKey => {
            Object.keys(assignments[dateKey]).forEach(serviceId => {
                assignmentsArray.push({
                    grup,
                    date_key: dateKey,
                    service_id: serviceId,
                    tips: assignments[dateKey][serviceId] || [],
                });
            });
        });

        // Eliminar asignaciones existentes del grupo
        await supabase.from('assignments').delete().eq('grup', grup);

        // Insertar nuevas asignaciones
        if (assignmentsArray.length > 0) {
            const { error } = await supabase.from('assignments').insert(assignmentsArray);
            if (error) throw error;
        }
    } catch (error) {
        console.error('Error saving assignments:', error);
    }
};

// Exportar todas las funciones del database.js original
export * from './database';
