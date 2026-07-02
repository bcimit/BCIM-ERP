import React from 'react';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';

// Shown for modules that exist in the web sidebar but don't have a
// dedicated mobile screen yet. Keeps the full menu navigable end-to-end
// while those screens get built out module by module.
export default function PlaceholderScreen({ route }) {
  const title = route?.params?.title || 'Module';
  return (
    <Screen>
      <ScreenHeader title={title} showBack />
      <EmptyState
        icon="hammer-wrench"
        title="Coming soon on mobile"
        subtitle={`${title} isn't available in the app yet. Use the web dashboard for this module.`}
      />
    </Screen>
  );
}
