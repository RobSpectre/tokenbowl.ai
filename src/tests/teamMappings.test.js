import { describe, it, expect } from 'vitest'
import { getTeamInfo, getTeamInfoByAiModel } from '../teamMappings.js'

describe('Team Mappings', () => {
  describe('getTeamInfo', () => {
    it('should return team info for valid Sleeper username', () => {
      const teamInfo = getTeamInfo('718Rob')

      expect(teamInfo).toBeDefined()
      expect(teamInfo.owner).toBe('Rob Spectre')
      expect(teamInfo.aiModel).toBe('DeepSeek')
      expect(teamInfo.color).toBeDefined()
      expect(teamInfo.logo).toBeDefined()
    })

    it('should return team info for all valid usernames', () => {
      const usernames = [
        '718Rob',
        'CheffyB',
        'rickyrobinett',
        'theycallmeswift',
        'dkundel',
        'bpartridge',
        'GregBaugues',
        'hermes',
        'kwhinnery',
        'QwentrolGroup',
        'KimiK2'
      ]

      usernames.forEach(username => {
        const teamInfo = getTeamInfo(username)
        expect(teamInfo).toBeDefined()
        expect(teamInfo.owner).toBeDefined()
        expect(teamInfo.aiModel).toBeDefined()
        expect(teamInfo.color).toBeDefined()
      })
    })

    it('should return default object for invalid username', () => {
      const teamInfo = getTeamInfo('invalid_username_123')

      expect(teamInfo).toBeDefined()
      expect(teamInfo.owner).toBe('invalid_username_123')
      expect(teamInfo.aiModel).toBe('Unknown')
      expect(teamInfo.color).toBe('#95A5A6')
      expect(teamInfo.gradient).toBe('from-gray-500 to-slate-500')
    })

    it('should return default object for empty username', () => {
      const teamInfo = getTeamInfo('')

      expect(teamInfo).toBeDefined()
      expect(teamInfo.owner).toBe('')
      expect(teamInfo.aiModel).toBe('Unknown')
    })

    it('should return default object for undefined username', () => {
      const teamInfo = getTeamInfo(undefined)

      expect(teamInfo).toBeDefined()
      expect(teamInfo.owner).toBe(undefined)
      expect(teamInfo.aiModel).toBe('Unknown')
    })

    it('should return default object for null username', () => {
      const teamInfo = getTeamInfo(null)

      expect(teamInfo).toBeDefined()
      expect(teamInfo.owner).toBe(null)
      expect(teamInfo.aiModel).toBe('Unknown')
    })

    it('should return correct team info for DeepSeek', () => {
      const teamInfo = getTeamInfo('718Rob')

      expect(teamInfo.aiModel).toBe('DeepSeek')
      expect(teamInfo.logo).toBe('/images/logos/deepseek-color.svg')
    })

    it('should return correct team info for Mistral', () => {
      const teamInfo = getTeamInfo('CheffyB')

      expect(teamInfo.aiModel).toBe('Mistral')
      expect(teamInfo.owner).toBe('Brent Schooley')
      expect(teamInfo.logo).toBe('/images/logos/mistral-color.svg')
    })

    it('should return correct team info for Gemini', () => {
      const teamInfo = getTeamInfo('rickyrobinett')

      expect(teamInfo.aiModel).toBe('Gemini')
      expect(teamInfo.owner).toBe('Ricky Robinett')
      expect(teamInfo.logo).toBe('/images/logos/gemini-color.svg')
    })

    it('should return correct team info for Gemma', () => {
      const teamInfo = getTeamInfo('theycallmeswift')

      expect(teamInfo.aiModel).toBe('Gemma')
      expect(teamInfo.owner).toBe('Mike Swift')
      expect(teamInfo.logo).toBe('/images/logos/gemma-color.svg')
    })

    it('should return correct team info for GPT', () => {
      const teamInfo = getTeamInfo('dkundel')

      expect(teamInfo.aiModel).toBe('GPT')
      expect(teamInfo.owner).toBe('Dominik Kundel')
      expect(teamInfo.logo).toBe('/images/logos/openai-white.svg')
    })

    it('should return correct team info for GPT-OSS', () => {
      const teamInfo = getTeamInfo('bpartridge')

      expect(teamInfo.aiModel).toBe('GPT-OSS')
      expect(teamInfo.owner).toBe('Brian Partridge')
      expect(teamInfo.logo).toBe('/images/logos/openai-white.svg')
    })

    it('should return correct team info for Claude', () => {
      const teamInfo = getTeamInfo('GregBaugues')

      expect(teamInfo.aiModel).toBe('Claude')
      expect(teamInfo.owner).toBe('Greg Baugues')
      expect(teamInfo.logo).toBe('/images/logos/claude-color.svg')
    })

    it('should return correct team info for Grok', () => {
      const teamInfo = getTeamInfo('kwhinnery')

      expect(teamInfo.aiModel).toBe('Grok')
      expect(teamInfo.owner).toBe('Kevin Whinnery')
      expect(teamInfo.logo).toBe('/images/logos/grok-white.svg')
    })

    it('should have color gradients for all teams', () => {
      const usernames = [
        '718Rob',
        'CheffyB',
        'rickyrobinett',
        'theycallmeswift',
        'dkundel',
        'bpartridge',
        'GregBaugues',
        'hermes',
        'kwhinnery',
        'QwentrolGroup',
        'KimiK2'
      ]

      usernames.forEach(username => {
        const teamInfo = getTeamInfo(username)
        expect(teamInfo.gradient).toMatch(/^from-\w+-\d+ to-\w+-\d+$/)
      })
    })
  })

  describe('getTeamInfoByAiModel', () => {
    it('should return team info by AI model name', () => {
      const teamInfo = getTeamInfoByAiModel('DeepSeek')

      expect(teamInfo).toBeDefined()
      expect(teamInfo.owner).toBe('Rob Spectre')
      expect(teamInfo.aiModel).toBe('DeepSeek')
      expect(teamInfo.logo).toBe('/images/logos/deepseek-color.svg')
    })

    it('should be case-insensitive', () => {
      const teamInfo1 = getTeamInfoByAiModel('deepseek')
      const teamInfo2 = getTeamInfoByAiModel('DEEPSEEK')
      const teamInfo3 = getTeamInfoByAiModel('DeepSeek')

      expect(teamInfo1.aiModel).toBe('DeepSeek')
      expect(teamInfo2.aiModel).toBe('DeepSeek')
      expect(teamInfo3.aiModel).toBe('DeepSeek')
    })

    it('should return team info for all AI models', () => {
      const models = [
        'DeepSeek',
        'Mistral',
        'Gemini',
        'Gemma',
        'GPT',
        'GPT-OSS',
        'Claude',
        'Hermes',
        'Grok',
        'Qwen',
        'Kimi K2'
      ]

      models.forEach(model => {
        const teamInfo = getTeamInfoByAiModel(model)
        expect(teamInfo).toBeDefined()
        expect(teamInfo.aiModel).toBe(model)
        expect(teamInfo.owner).toBeDefined()
      })
    })

    it('should return default object for unknown AI model', () => {
      const teamInfo = getTeamInfoByAiModel('UnknownAI')

      expect(teamInfo).toBeDefined()
      expect(teamInfo.owner).toBe('UnknownAI')
      expect(teamInfo.aiModel).toBe('UnknownAI')
      expect(teamInfo.color).toBe('#95A5A6')
      expect(teamInfo.gradient).toBe('from-gray-500 to-slate-500')
      expect(teamInfo.logo).toBe('')
    })

    it('should handle empty string', () => {
      const teamInfo = getTeamInfoByAiModel('')

      expect(teamInfo).toBeDefined()
      expect(teamInfo.aiModel).toBe('')
    })
  })
})
