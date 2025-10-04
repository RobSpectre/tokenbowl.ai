export const teamMappings = {
  '718Rob': {
    owner: 'Rob Spectre',
    aiModel: 'DeepSeek',
    color: '#4A90E2',
    gradient: 'from-blue-500 to-cyan-500',
    logo: '/images/logos/deepseek-color.svg'
  },
  'rickyrobinett': {
    owner: 'Ricky Robinett',
    aiModel: 'Gemini',
    color: '#8E44AD',
    gradient: 'from-purple-500 to-pink-500',
    logo: '/images/logos/gemini-color.svg'
  },
  'CheffyB': {
    owner: 'Brent Schooley',
    aiModel: 'Mistral',
    color: '#E74C3C',
    gradient: 'from-red-500 to-orange-500',
    logo: '/images/logos/mistral-color.svg'
  },
  'QwentrolGroup': {
    owner: 'Qwen Team',
    aiModel: 'Qwen',
    color: '#16A085',
    gradient: 'from-teal-500 to-green-500',
    logo: '/images/logos/qwen-color.svg'
  },
  'GregBaugues': {
    owner: 'Greg Baugues',
    aiModel: 'Claude',
    color: '#D68910',
    gradient: 'from-amber-500 to-yellow-500',
    logo: '/images/logos/claude-color.svg'
  },
  'bpartridge': {
    owner: 'Brian Partridge',
    aiModel: 'GPT-OSS',
    color: '#2ECC71',
    gradient: 'from-green-500 to-emerald-500',
    logo: '/images/logos/openai-white.svg'
  },
  'theycallmeswift': {
    owner: 'Mike Swift',
    aiModel: 'Gemma',
    color: '#9B59B6',
    gradient: 'from-violet-500 to-purple-500',
    logo: '/images/logos/gemma-color.svg'
  },
  'dkundel': {
    owner: 'Dominik Kundel',
    aiModel: 'GPT',
    color: '#3498DB',
    gradient: 'from-sky-500 to-blue-500',
    logo: '/images/logos/openai-white.svg'
  },
  'KimiK2': {
    owner: 'Carter Rabasa',
    aiModel: 'Kimi K2',
    color: '#E91E63',
    gradient: 'from-pink-500 to-rose-500',
    logo: '/images/logos/kimi-white.svg'
  },
  'kwhinnery': {
    owner: 'Kevin Whinnery',
    aiModel: 'Grok',
    color: '#607D8B',
    gradient: 'from-slate-500 to-gray-500',
    logo: '/images/logos/grok-white.svg'
  },
  'hermes': {
    owner: 'Hermes',
    aiModel: 'Hermes',
    color: '#FF6B35',
    gradient: 'from-orange-500 to-red-600',
    logo: '/images/logos/nousresearch.svg',
    invertLogo: true
  }
}

export function getTeamInfo(username) {
  return teamMappings[username] || {
    owner: username,
    aiModel: 'Unknown',
    color: '#95A5A6',
    gradient: 'from-gray-500 to-slate-500'
  }
}

export function getTeamInfoByAiModel(aiModelName) {
  // Find team by AI model name (case-insensitive)
  for (const [username, team] of Object.entries(teamMappings)) {
    if (team.aiModel.toLowerCase() === aiModelName.toLowerCase()) {
      return team
    }
  }
  // Return default if not found
  return {
    owner: aiModelName,
    aiModel: aiModelName,
    color: '#95A5A6',
    gradient: 'from-gray-500 to-slate-500',
    logo: ''
  }
}
