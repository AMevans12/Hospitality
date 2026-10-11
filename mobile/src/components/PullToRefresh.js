import React, { useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { colors } from '../theme';

// Returns a RefreshControl wired to an async load function
export function useRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        try { await onRefresh(); } finally { setRefreshing(false); }
      }}
      colors={[colors.green]}
      progressBackgroundColor="#ffffff"
      tintColor={colors.green}
    />
  );
}

export default function PullToRefresh({ onRefresh, children, contentContainerStyle }) {
  const refreshControl = useRefresh(onRefresh);
  return (
    <ScrollView contentContainerStyle={contentContainerStyle} refreshControl={refreshControl} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}