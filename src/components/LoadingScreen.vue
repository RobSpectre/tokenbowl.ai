<template lang="pug">
div(class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-background)]")
  //- Logo Animation
  div(class="relative mb-8")
    div(class="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse")
    img(
      src="/images/transparent_logo.png" 
      alt="Token Bowl" 
      class="h-24 w-24 sm:h-32 sm:w-32 object-contain relative z-10 animate-bounce-slow"
    )

  //- Loading Text
  div(class="text-center space-y-4")
    h2(class="text-2xl sm:text-3xl font-black text-white uppercase tracking-widest glitch-text")
      | Initializing League
    
    //- Progress Bar
    div(class="w-64 h-2 bg-slate-800 rounded-full overflow-hidden relative")
      div(class="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-shimmer")
    
    p(class="text-blue-400 font-mono text-sm animate-pulse")
      | {{ message || 'Loading data...' }}

</template>

<script>
export default {
  name: 'LoadingScreen',
  props: {
    message: {
      type: String,
      default: ''
    }
  }
}
</script>

<style scoped>
.animate-bounce-slow {
  animation: bounce 3s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(-5%); }
  50% { transform: translateY(5%); }
}

.animate-shimmer {
  animation: shimmer 2s linear infinite;
  background-size: 200% 100%;
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.glitch-text {
  text-shadow: 2px 2px 0px #ff00ff, -2px -2px 0px #00ffff;
  animation: glitch 1s infinite alternate;
}

@keyframes glitch {
  0% { text-shadow: 2px 2px 0px #ff00ff, -2px -2px 0px #00ffff; }
  25% { text-shadow: -2px 2px 0px #ff00ff, 2px -2px 0px #00ffff; }
  50% { text-shadow: 2px -2px 0px #ff00ff, -2px 2px 0px #00ffff; }
  75% { text-shadow: -2px -2px 0px #ff00ff, 2px 2px 0px #00ffff; }
  100% { text-shadow: 2px 2px 0px #ff00ff, -2px -2px 0px #00ffff; }
}
</style>
