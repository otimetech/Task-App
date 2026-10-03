<template>
  <div class="min-h-screen bg-app">
    <AppSidebar />
    <div class="px-4 pb-20 lg:ml-[196px] lg:pb-4">
      <AppTopbar />
      <main>
        <slot />
      </main>
    </div>
    <BottomNav />
  </div>
</template>
