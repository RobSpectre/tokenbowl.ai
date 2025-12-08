<template lang="pug">
div(class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-background)] p-4")
  div(class="max-w-md w-full bg-slate-900 border border-red-500/50 rounded-lg p-8 text-center shadow-2xl relative overflow-hidden")
    //- Background effect
    div(class="absolute inset-0 bg-red-500/5 pointer-events-none")
    
    //- Icon
    div(class="mb-6 relative")
      div(class="absolute inset-0 bg-red-500/20 blur-xl rounded-full")
      span(class="text-6xl relative z-10") ⚠️

    h2(class="text-2xl font-black text-white uppercase tracking-widest mb-2")
      | System Malfunction

    p(class="text-gray-400 mb-6 font-mono text-sm")
      | {{ error || 'An unexpected error occurred while communicating with the league mainframe.' }}

    div(class="flex flex-col gap-3")
      button(
        @click="$emit('retry')"
        class="w-full px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider rounded transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      )
        | Reboot System
      
      button(
        @click="reloadPage"
        class="w-full px-6 py-3 bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white font-bold uppercase tracking-wider rounded transition-all duration-200"
      )
        | Hard Reset

</template>

<script>
export default {
  name: 'ErrorState',
  props: {
    error: {
      type: String,
      default: ''
    }
  },
  emits: ['retry'],
  setup() {
    const reloadPage = () => {
      window.location.reload()
    }

    return {
      reloadPage
    }
  }
}
</script>
