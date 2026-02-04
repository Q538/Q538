// import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configura com es comporten les notificacions quan l'app està oberta
/*
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldVibrate: true,
    }),
});
*/

export async function registerForPushNotificationsAsync() {
    /*
    try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            return false;
        }

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
        return true;
    } catch (e) {
        return false;
    }
    */
    return false;
}

export async function sendLocalNotification(title, body) {
    /*
    try {
        await registerForPushNotificationsAsync();

        await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            },
            trigger: null, // trigger immediat
        });
    } catch (e) {
        console.error("Local Notification Error:", e);
    }
    */
    console.log("Notification disabled in Expo Go:", title, body);
}
