import { Alert } from 'react-native';

export function openAccountMenu({ user, navigation, logout }) {
  Alert.alert(user.name, user.employee_id, [
    { text: 'Change PIN', onPress: () => navigation.navigate('ChangePin') },
    { text: 'Log out', style: 'destructive', onPress: logout },
    { text: 'Cancel', style: 'cancel' },
  ]);
}