import { View, Image, Text, StyleSheet } from 'react-native'

export function PoweredBy() {
  return (
    <View style={s.row}>
      <Text style={s.label}>Powered by</Text>
      <Image
        source={{ uri: 'https://zdrheylkqoptoiuqwnma.supabase.co/storage/v1/object/public/assets/clubspark-logo.png' }}
        style={s.logo}
        resizeMode="contain"
        tintColor="#94a3b8"
      />
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 24, opacity: 0.6 },
  label: { fontSize: 11, color: '#94a3b8' },
  logo: { width: 72, height: 16 },
})
