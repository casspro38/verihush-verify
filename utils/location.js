import * as Location from 'expo-location';

// ============================================
// VeriHush Legal Config v2.0
// Recording law database for 9 countries
// Based on legal research, structured for app use
// ============================================

export const LEGAL_DB = {
  US: {
    code: 'US',
    country: 'United States',
    emoji: '\uD83C\uDDFA\uD83C\uDDF8',
    consentType: 'mixed',
    onePartyDefault: true,
    twoPartyRegions: [
      'California', 'Connecticut', 'Delaware', 'Florida',
      'Illinois', 'Maryland', 'Massachusetts', 'Michigan',
      'Montana', 'Nevada', 'New Hampshire', 'Oregon',
      'Pennsylvania', 'Washington',
    ],
    contexts: {
      workplace: {
        risk: 'medium',
        guide: 'Most states allow participant recording. Two-party states carry criminal/civil risk. Check company policy.',
        guideKo: '\uB300\uBD80\uBD84 \uC8FC\uC5D0\uC11C \uCC38\uC5EC\uC790 \uB179\uC74C \uD5C8\uC6A9. 2\uC778 \uB3D9\uC758 \uC8FC\uB294 \uD615\uC0AC\u00B7\uBBFC\uC0AC \uC704\uD5D8. \uD68C\uC0AC \uADDC\uC815 \uD655\uC778 \uD544\uC694.',
        guideJa: '\u307B\u3068\u3093\u3069\u306E\u5DDE\u3067\u53C2\u52A0\u8005\u9332\u97F3\u304C\u8A31\u53EF\u3002\u4E8C\u8005\u540C\u610F\u5DDE\u3067\u306F\u5211\u4E8B\u30FB\u6C11\u4E8B\u30EA\u30B9\u30AF\u3042\u308A\u3002',
      },
      school: {
        risk: 'medium',
        guide: 'Varies by state and school district policy. Discrimination/abuse cases may allow exceptions.',
        guideKo: '\uC8FC\uBC95\uACFC \uD559\uAD6C \uC815\uCC45\uC5D0 \uB530\uB77C \uB2E4\uB984. \uCC28\uBCC4\u00B7\uD559\uB300 \uC0AC\uAC74\uC740 \uC608\uC678 \uAC00\uB2A5.',
        guideJa: '\u5DDE\u6CD5\u3068\u5B66\u6821\u65B9\u91DD\u306B\u3088\u308A\u7570\u306A\u308B\u3002\u5DEE\u5225\u30FB\u8650\u5F85\u306E\u5834\u5408\u306F\u4F8B\u5916\u3042\u308A\u3002',
      },
      home: {
        risk: 'medium',
        guide: 'Domestic violence evidence is often accepted. Two-party state violations still carry penalties.',
        guideKo: '\uAC00\uC815\uD3ED\uB825 \uC99D\uAC70\uB85C \uC778\uC815\uB418\uB098, 2\uC778 \uB3D9\uC758 \uC8FC \uC704\uBC18 \uC2DC \uCC98\uBC8C \uC704\uD5D8.',
        guideJa: '\u5BB6\u5EAD\u5185\u66B4\u529B\u306E\u8A3C\u62E0\u3068\u3057\u3066\u8A8D\u3081\u3089\u308C\u308B\u304C\u3001\u4E8C\u8005\u540C\u610F\u5DDE\u3067\u306F\u7F70\u5247\u3042\u308A\u3002',
      },
      public: {
        risk: 'low',
        guide: 'Generally allowed in public spaces with no expectation of privacy.',
        guideKo: '\uACF5\uACF5\uC7A5\uC18C\uC5D0\uC11C\uB294 \uC77C\uBC18\uC801\uC73C\uB85C \uD5C8\uC6A9.',
        guideJa: '\u516C\u5171\u306E\u5834\u3067\u306F\u4E00\u822C\u7684\u306B\u8A31\u53EF\u3002',
      },
    },
    evidenceNote: 'Strong evidence in labor/discrimination cases. Illegally obtained recordings may be excluded in two-party states.',
    evidenceNoteKo: '\uB178\uB3D9\u00B7\uCC28\uBCC4 \uC0AC\uAC74\uC5D0\uC11C \uAC15\uB825\uD55C \uC99D\uAC70. 2\uC778 \uB3D9\uC758 \uC8FC \uC704\uBC18 \uB179\uC74C\uC740 \uBC30\uC81C \uAC00\uB2A5.',
  },

  GB: {
    code: 'GB',
    country: 'United Kingdom',
    emoji: '\uD83C\uDDEC\uD83C\uDDE7',
    consentType: 'two_party',
    contexts: {
      workplace: {
        risk: 'high',
        guide: 'GDPR + Employment Law apply. Covert recording may be accepted as evidence but damages trust. Risk of disciplinary action.',
        guideKo: 'GDPR+\uACE0\uC6A9\uBC95 \uC801\uC6A9. \uBE44\uBC00\uB179\uC74C\uC740 \uC99D\uAC70\uB85C \uCC44\uD0DD \uAC00\uB2A5\uD558\uB098 \uC2E0\uB8B0 \uD30C\uAD34\u00B7\uC9D5\uACC4 \uC704\uD5D8.',
        guideJa: 'GDPR+\u96C7\u7528\u6CD5\u304C\u9069\u7528\u3002\u79D8\u5BC6\u9332\u97F3\u306F\u8A3C\u62E0\u63A1\u7528\u53EF\u80FD\u3060\u304C\u4FE1\u983C\u640D\u5931\u30FB\u61F2\u6212\u30EA\u30B9\u30AF\u3042\u308A\u3002',
      },
      school: {
        risk: 'high',
        guide: 'Recording teachers/students triggers GDPR data processing rules. School policy violations likely.',
        guideKo: '\uAD50\uC0AC\u00B7\uD559\uC0DD \uB179\uC74C\uC740 GDPR \uAC1C\uC778\uC815\uBCF4 \uCC98\uB9AC \uBB38\uC81C. \uD559\uAD50 \uADDC\uC815 \uC704\uBC18 \uAC00\uB2A5\uC131.',
        guideJa: '\u6559\u5E2B\u30FB\u751F\u5F92\u306E\u9332\u97F3\u306FGDPR\u500B\u4EBA\u60C5\u5831\u51E6\u7406\u306B\u8A72\u5F53\u3002\u5B66\u6821\u898F\u5247\u9055\u53CD\u306E\u53EF\u80FD\u6027\u3002',
      },
      home: {
        risk: 'medium',
        guide: 'Personal use may be exempt from GDPR. Sharing or publishing triggers full data protection law.',
        guideKo: '\uAC1C\uC778 \uC6A9\uB3C4\uB294 GDPR \uC608\uC678 \uAC00\uB2A5. \uACF5\uC720\u00B7\uAC8C\uC2DC \uC2DC \uBC95 \uC801\uC6A9.',
        guideJa: '\u500B\u4EBA\u4F7F\u7528\u306FGDPR\u514D\u9664\u53EF\u80FD\u3002\u5171\u6709\u30FB\u516C\u958B\u6642\u306F\u6CD5\u304C\u9069\u7528\u3002',
      },
    },
    evidenceNote: 'Meetings you attended may be used as evidence. Private deliberation recordings are excluded.',
    evidenceNoteKo: '\uBCF8\uC778 \uCC38\uC11D \uD68C\uC758 \uBD80\uBD84\uC740 \uC99D\uAC70 \uCC44\uD0DD \uAC00\uB2A5. \uBE44\uACF5\uAC1C \uC2EC\uC758 \uB179\uC74C\uC740 \uBC30\uC81C.',
  },

  AU: {
    code: 'AU',
    country: 'Australia',
    emoji: '\uD83C\uDDE6\uD83C\uDDFA',
    consentType: 'state_mixed',
    twoPartyRegions: [
      'New South Wales', 'Victoria', 'South Australia',
      'Western Australia', 'Tasmania', 'Australian Capital Territory',
    ],
    onePartyRegions: ['Queensland', 'Northern Territory'],
    contexts: {
      workplace: {
        risk: 'medium',
        guide: 'Fair Work Commission may accept covert recordings in bullying/unfair dismissal cases, even if state law was violated.',
        guideKo: '\uACF5\uC815\uADFC\uB85C\uC704\uB294 \uC8FC\uBC95 \uC704\uBC18\uC774\uB77C\uB3C4 \uAD34\uB86D\uD798\u00B7\uBD80\uB2F9\uD574\uACE0 \uC0AC\uAC74\uC5D0\uC11C \uBE44\uBC00\uB179\uC74C \uCC44\uD0DD \uAC00\uB2A5.',
        guideJa: '\u516C\u6B63\u52B4\u50CD\u59D4\u54E1\u4F1A\u306F\u5DDE\u6CD5\u9055\u53CD\u3067\u3082\u3044\u3058\u3081\u30FB\u4E0D\u5F53\u89E3\u96C7\u4E8B\u4EF6\u3067\u79D8\u5BC6\u9332\u97F3\u3092\u63A1\u7528\u53EF\u80FD\u3002',
      },
      school: {
        risk: 'high',
        guide: 'Private conversations in schools likely require all-party consent in most states.',
        guideKo: '\uD559\uAD50 \uB0B4 \uC0AC\uC801 \uB300\uD654\uB294 \uB300\uBD80\uBD84 \uC8FC\uC5D0\uC11C \uC804\uC6D0 \uB3D9\uC758 \uD544\uC694.',
        guideJa: '\u5B66\u6821\u5185\u306E\u79C1\u7684\u4F1A\u8A71\u306F\u307B\u3068\u3093\u3069\u306E\u5DDE\u3067\u5168\u54E1\u540C\u610F\u304C\u5FC5\u8981\u3002',
      },
      home: {
        risk: 'medium',
        guide: 'Domestic recording rules follow state surveillance/listening device acts.',
        guideKo: '\uAC00\uC815 \uB0B4 \uB179\uC74C\uC740 \uC8FC\uBCC4 \uAC10\uCCAD\uC7A5\uCE58\uBC95\uC5D0 \uB530\uB984.',
        guideJa: '\u5BB6\u5EAD\u5185\u9332\u97F3\u306F\u5DDE\u306E\u76E3\u8996\u88C5\u7F6E\u6CD5\u306B\u5F93\u3046\u3002',
      },
    },
    evidenceNote: 'Illegality and evidence admissibility are treated separately. Labor tribunals may still consider illegal recordings.',
    evidenceNoteKo: '\uC704\uBC95\uC131\uACFC \uC99D\uAC70\uB2A5\uB825\uC740 \uBCC4\uAC1C. \uB178\uB3D9\uC2EC\uD310\uC5D0\uC11C \uC704\uBC95 \uB179\uC74C\uB3C4 \uACE0\uB824 \uAC00\uB2A5.',
  },

  CA: {
    code: 'CA',
    country: 'Canada',
    emoji: '\uD83C\uDDE8\uD83C\uDDE6',
    consentType: 'one_party',
    contexts: {
      workplace: {
        risk: 'low',
        guide: 'Participant recording is legal federally. Widely used as evidence in harassment and unfair dismissal cases.',
        guideKo: '\uC5F0\uBC29\uBC95 \uAE30\uC900 \uCC38\uC5EC\uC790 \uB179\uC74C \uD569\uBC95. \uAD34\uB86D\uD798\u00B7\uBD80\uB2F9\uD574\uACE0 \uC0AC\uAC74\uC5D0\uC11C \uB110\uB9AC \uC0AC\uC6A9.',
        guideJa: '\u9023\u90A6\u6CD5\u3067\u53C2\u52A0\u8005\u9332\u97F3\u306F\u5408\u6CD5\u3002\u30CF\u30E9\u30B9\u30E1\u30F3\u30C8\u30FB\u4E0D\u5F53\u89E3\u96C7\u4E8B\u4EF6\u3067\u5E83\u304F\u4F7F\u7528\u3002',
      },
      school: {
        risk: 'low',
        guide: 'Legal if you are part of the conversation. Extra caution with minors involved.',
        guideKo: '\uBCF8\uC778 \uCC38\uC5EC \uC2DC \uD569\uBC95. \uBBF8\uC131\uB144\uC790 \uAD00\uB828 \uC2DC \uCD94\uAC00 \uC8FC\uC758.',
        guideJa: '\u672C\u4EBA\u304C\u53C2\u52A0\u3057\u3066\u3044\u308C\u3070\u5408\u6CD5\u3002\u672A\u6210\u5E74\u8005\u95A2\u4FC2\u306F\u8FFD\u52A0\u6CE8\u610F\u3002',
      },
      home: {
        risk: 'low',
        guide: 'Legal for participants. Domestic violence recordings are strong evidence.',
        guideKo: '\uCC38\uC5EC\uC790 \uB179\uC74C \uD569\uBC95. \uAC00\uC815\uD3ED\uB825 \uC99D\uAC70\uB85C \uAC15\uB825.',
        guideJa: '\u53C2\u52A0\u8005\u9332\u97F3\u306F\u5408\u6CD5\u3002DV\u8A3C\u62E0\u3068\u3057\u3066\u5F37\u529B\u3002',
      },
    },
    evidenceNote: 'Human rights tribunals, labor boards, and courts all actively use audio evidence.',
    evidenceNoteKo: '\uC778\uAD8C\uC704\u00B7\uB178\uB3D9\uC704\u00B7\uBC95\uC6D0 \uBAA8\uB450 \uC624\uB514\uC624 \uC99D\uAC70 \uC801\uADF9 \uD65C\uC6A9.',
  },

  JP: {
    code: 'JP',
    country: 'Japan',
    emoji: '\uD83C\uDDEF\uD83C\uDDF5',
    consentType: 'one_party_practice',
    contexts: {
      workplace: {
        risk: 'medium',
        guide: 'No criminal penalty for participant recording, but privacy/trust issues. Commonly used in power harassment lawsuits.',
        guideKo: '\uCC38\uC5EC\uC790 \uB179\uC74C \uD615\uC0AC\uCC98\uBC8C \uC5C6\uC74C. \uD504\uB77C\uC774\uBC84\uC2DC\u00B7\uC2E0\uB8B0 \uBB38\uC81C \uC788\uC74C. \uAC11\uC9C8 \uC18C\uC1A1\uC5D0\uC11C \uB110\uB9AC \uD65C\uC6A9.',
        guideJa: '\u53C2\u52A0\u8005\u9332\u97F3\u306B\u5211\u4E8B\u7F70\u306A\u3057\u3002\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u30FB\u4FE1\u983C\u554F\u984C\u3042\u308A\u3002\u30D1\u30EF\u30CF\u30E9\u8A34\u8A1F\u3067\u5E83\u304F\u4F7F\u7528\u3002',
      },
      school: {
        risk: 'medium',
        guide: 'Not criminally punishable. Publishing may trigger defamation/privacy claims.',
        guideKo: '\uD615\uC0AC\uCC98\uBC8C \uC5C6\uC74C. \uACF5\uAC1C\u00B7\uC720\uD3EC \uC2DC \uBA85\uC608\uD6FC\uC190\u00B7\uD504\uB77C\uC774\uBC84\uC2DC \uCE68\uD574 \uC18C\uC9C0.',
        guideJa: '\u5211\u4E8B\u7F70\u306A\u3057\u3002\u516C\u958B\u30FB\u62E1\u6563\u6642\u306F\u540D\u8A89\u6BC4\u640D\u30FB\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u4FB5\u5BB3\u306E\u304A\u305D\u308C\u3002',
      },
      home: {
        risk: 'low',
        guide: 'Frequently used in divorce and DV cases. Courts accept with limited scope.',
        guideKo: '\uC774\uD63C\u00B7\uAC00\uC815\uD3ED\uB825 \uC0AC\uAC74\uC5D0\uC11C \uC790\uC8FC \uC0AC\uC6A9. \uBC94\uC6D0\uC774 \uC81C\uD55C\uC801 \uBC94\uC704\uB85C \uC778\uC815.',
        guideJa: '\u96E2\u5A5A\u30FBDV\u4E8B\u4EF6\u3067\u983B\u7E41\u306B\u4F7F\u7528\u3002\u88C1\u5224\u6240\u304C\u9650\u5B9A\u7684\u7BC4\u56F2\u3067\u8A8D\u5B9A\u3002',
      },
    },
    evidenceNote: 'Exclusionary rule is weaker than in the US. Covert recordings are frequently admitted in labor/human rights cases.',
    evidenceNoteKo: '\uC704\uBC95\uC218\uC9D1\uC99D\uAC70 \uBC30\uC81C\uAC00 \uBBF8\uAD6D\uBCF4\uB2E4 \uC57D\uD574 \uBE44\uBC00\uB179\uC74C\uC774 \uB178\uB3D9\u00B7\uC778\uAD8C \uC0AC\uAC74\uC5D0\uC11C \uC790\uC8FC \uC778\uC815.',
  },

  SG: {
    code: 'SG',
    country: 'Singapore',
    emoji: '\uD83C\uDDF8\uD83C\uDDEC',
    consentType: 'pdpa_contextual',
    contexts: {
      workplace: {
        risk: 'medium',
        guide: 'PDPA requires notice and consent for call/meeting recording. Personal evidence recording is not clearly illegal, but sharing method determines liability.',
        guideKo: 'PDPA\uC0C1 \uD1B5\uD654\u00B7\uD68C\uC758 \uB179\uC74C\uC740 \uACE0\uC9C0\u00B7\uB3D9\uC758 \uD544\uC218. \uAC1C\uC778 \uC99D\uAC70 \uB179\uC74C\uC740 \uC0AC\uC6A9\u00B7\uACF5\uC720 \uBC29\uBC95\uC5D0 \uB530\uB77C \uCC45\uC784.',
        guideJa: 'PDPA\u306B\u3088\u308A\u901A\u8A71\u30FB\u4F1A\u8B70\u9332\u97F3\u306F\u901A\u77E5\u30FB\u540C\u610F\u304C\u5FC5\u8981\u3002\u500B\u4EBA\u8A3C\u62E0\u9332\u97F3\u306F\u4F7F\u7528\u30FB\u5171\u6709\u65B9\u6CD5\u3067\u8CAC\u4EFB\u304C\u6C7A\u307E\u308B\u3002',
      },
      school: {
        risk: 'medium',
        guide: 'Same PDPA/POHA principles apply. Reasonable expectation of privacy in closed rooms.',
        guideKo: 'PDPA/POHA \uC6D0\uCE59 \uB3D9\uC77C \uC801\uC6A9. \uBC00\uD3D0 \uACF5\uAC04\uC5D0\uC11C\uB294 \uD569\uB9AC\uC801 \uD504\uB77C\uC774\uBC84\uC2DC \uAE30\uB300.',
        guideJa: 'PDPA/POHA\u306E\u539F\u5247\u304C\u540C\u69D8\u306B\u9069\u7528\u3002\u5BC6\u5BA4\u3067\u306F\u5408\u7406\u7684\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u671F\u5F85\u3042\u308A\u3002',
      },
      home: {
        risk: 'medium',
        guide: 'Unauthorized recording where privacy is expected may lead to civil liability.',
        guideKo: '\uD504\uB77C\uC774\uBC84\uC2DC\uAC00 \uAE30\uB300\uB418\uB294 \uACF3\uC5D0\uC11C \uBB34\uB2E8 \uB179\uC74C\uC740 \uBBFC\uC0AC\uCC45\uC784 \uAC00\uB2A5.',
        guideJa: '\u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u304C\u671F\u5F85\u3055\u308C\u308B\u5834\u6240\u3067\u306E\u7121\u65AD\u9332\u97F3\u306F\u6C11\u4E8B\u8CAC\u4EFB\u306E\u53EF\u80FD\u6027\u3002',
      },
    },
    evidenceNote: 'Courts may consider illegally obtained recordings if deemed necessary. Separate liability for privacy violation remains.',
    evidenceNoteKo: '\uBC95\uC6D0\uC774 \uD544\uC694\uD558\uBA74 \uC704\uBC95 \uB179\uC74C\uB3C4 \uACE0\uB824 \uAC00\uB2A5. \uD504\uB77C\uC774\uBC84\uC2DC \uCE68\uD574 \uBCC4\uB3C4 \uCC45\uC784 \uC874\uC7AC.',
  },

  KR: {
    code: 'KR',
    country: 'South Korea',
    emoji: '\uD83C\uDDF0\uD83C\uDDF7',
    consentType: 'one_party',
    contexts: {
      workplace: {
        risk: 'low',
        guide: 'Participant recording is legal. Primary evidence in workplace bullying, unfair dismissal, and wage disputes.',
        guideKo: '\uBCF8\uC778 \uCC38\uC5EC \uB179\uC74C \uD569\uBC95. \uC9C1\uC7A5 \uAD34\uB86D\uD798\u00B7\uBD80\uB2F9\uD574\uACE0\u00B7\uC784\uAE08 \uBD84\uC7C1\uC5D0\uC11C \uD575\uC2EC \uC99D\uAC70.',
        guideJa: '\u672C\u4EBA\u53C2\u52A0\u9332\u97F3\u306F\u5408\u6CD5\u3002\u8077\u5834\u3044\u3058\u3081\u30FB\u4E0D\u5F53\u89E3\u96C7\u30FB\u8CC3\u91D1\u7D1B\u4E89\u306E\u6838\u5FC3\u8A3C\u62E0\u3002',
      },
      school: {
        risk: 'medium',
        guide: 'Your own recording is legal. Placing a recorder in a child\'s bag to record others\' conversations is wiretapping (Supreme Court ruling).',
        guideKo: '\uBCF8\uC778 \uB179\uC74C\uC740 \uD569\uBC95. \uC790\uB140 \uAC00\uBC29\uC5D0 \uB179\uC74C\uAE30 \uB123\uC5B4 \uD0C0\uC778 \uB300\uD654 \uB179\uC74C\uC740 \uB3C4\uCCAD(\uB300\uBC95\uC6D0 \uD310\uB840).',
        guideJa: '\u672C\u4EBA\u306E\u9332\u97F3\u306F\u5408\u6CD5\u3002\u5B50\u4F9B\u306E\u304B\u3070\u3093\u306B\u9332\u97F3\u6A5F\u3092\u5165\u308C\u3066\u4ED6\u4EBA\u306E\u4F1A\u8A71\u3092\u9332\u97F3\u3059\u308B\u306E\u306F\u76D7\u8074\uFF08\u6700\u9AD8\u88C1\u5224\u4F8B\uFF09\u3002',
      },
      home: {
        risk: 'low',
        guide: 'Participant recordings in domestic violence and child abuse cases are strong evidence.',
        guideKo: '\uAC00\uC815\uD3ED\uB825\u00B7\uC544\uB3D9\uD559\uB300 \uC0AC\uAC74\uC5D0\uC11C \uBCF8\uC778 \uCC38\uC5EC \uB179\uC74C\uC740 \uAC15\uB825\uD55C \uC99D\uAC70.',
        guideJa: 'DV\u30FB\u5150\u7AE5\u8650\u5F85\u4E8B\u4EF6\u3067\u672C\u4EBA\u53C2\u52A0\u9332\u97F3\u306F\u5F37\u529B\u306A\u8A3C\u62E0\u3002',
      },
      public: {
        risk: 'low',
        guide: 'Public space recording is generally permitted when you are a participant.',
        guideKo: '\uACF5\uACF5\uC7A5\uC18C\uC5D0\uC11C \uBCF8\uC778 \uCC38\uC5EC \uB179\uC74C\uC740 \uC77C\uBC18\uC801\uC73C\uB85C \uD5C8\uC6A9.',
        guideJa: '\u516C\u5171\u306E\u5834\u3067\u306E\u672C\u4EBA\u53C2\u52A0\u9332\u97F3\u306F\u4E00\u822C\u7684\u306B\u8A31\u53EF\u3002',
      },
    },
    evidenceNote: 'Wiretapping others\' conversations violates the Protection of Communications Secrets Act. No evidence admissibility for illegal recordings in criminal cases.',
    evidenceNoteKo: '\uD0C0\uC778 \uAC04 \uB300\uD654 \uB3C4\uCCAD\uC740 \uD1B5\uBE44\uBC95 \uC704\uBC18. \uC704\uBC95 \uB179\uC74C\uC740 \uD615\uC0AC\uC7AC\uD310\uC5D0\uC11C \uC99D\uAC70\uB2A5\uB825 \uC5C6\uC74C.',
  },

  NZ: {
    code: 'NZ',
    country: 'New Zealand',
    emoji: '\uD83C\uDDF3\uD83C\uDDFF',
    consentType: 'one_party',
    contexts: {
      workplace: {
        risk: 'low',
        guide: 'Participant recording generally permitted. Workplace bullying is a significant issue.',
        guideKo: '\uCC38\uC5EC\uC790 \uB179\uC74C \uC77C\uBC18\uC801\uC73C\uB85C \uD5C8\uC6A9. \uC9C1\uC7A5 \uAD34\uB86D\uD798 \uBB38\uC81C \uC2EC\uAC01.',
        guideJa: '\u53C2\u52A0\u8005\u9332\u97F3\u306F\u4E00\u822C\u7684\u306B\u8A31\u53EF\u3002\u8077\u5834\u3044\u3058\u3081\u554F\u984C\u304C\u6DF1\u523B\u3002',
      },
    },
    evidenceNote: 'Similar to Australia. Labor disputes commonly involve audio evidence.',
    evidenceNoteKo: '\uD638\uC8FC\uC640 \uC720\uC0AC. \uB178\uB3D9 \uBD84\uC7C1\uC5D0\uC11C \uC624\uB514\uC624 \uC99D\uAC70 \uD750\uD788 \uD65C\uC6A9.',
  },

  IE: {
    code: 'IE',
    country: 'Ireland',
    emoji: '\uD83C\uDDEE\uD83C\uDDEA',
    consentType: 'two_party',
    contexts: {
      workplace: {
        risk: 'high',
        guide: 'GDPR and employment law apply similarly to the UK. Covert recording carries trust and disciplinary risks.',
        guideKo: 'GDPR\uACFC \uACE0\uC6A9\uBC95\uC774 \uC601\uAD6D\uACFC \uC720\uC0AC\uD558\uAC8C \uC801\uC6A9. \uBE44\uBC00\uB179\uC74C\uC740 \uC2E0\uB8B0\u00B7\uC9D5\uACC4 \uC704\uD5D8.',
        guideJa: 'GDPR\u3068\u96C7\u7528\u6CD5\u304C\u82F1\u56FD\u3068\u540C\u69D8\u306B\u9069\u7528\u3002\u79D8\u5BC6\u9332\u97F3\u306F\u4FE1\u983C\u30FB\u61F2\u6212\u30EA\u30B9\u30AF\u3042\u308A\u3002',
      },
    },
    evidenceNote: 'Similar to UK. GDPR compliance is critical for any recording shared or used formally.',
    evidenceNoteKo: '\uC601\uAD6D\uACFC \uC720\uC0AC. \uACF5\uC2DD \uC0AC\uC6A9\u00B7\uACF5\uC720 \uC2DC GDPR \uC900\uC218 \uD544\uC218.',
  },
};

// ============================================
// Helper Functions
// ============================================

export function getLegalContext(countryCode, region, scenario) {
  const law = LEGAL_DB[countryCode];
  if (!law) {
    return {
      found: false,
      country: 'Unknown',
      emoji: '\uD83C\uDF0D',
      consentType: 'unknown',
      safe: null,
      risk: 'unknown',
      guide: 'Recording laws for this location are not in our database. Please consult a local attorney.',
      guideKo: '\uC774 \uC9C0\uC5ED\uC758 \uB179\uC74C \uBC95\uADDC\uAC00 \uB370\uC774\uD130\uBCA0\uC774\uC2A4\uC5D0 \uC5C6\uC2B5\uB2C8\uB2E4. \uD604\uC9C0 \uBCC0\uD638\uC0AC\uC640 \uC0C1\uB2F4\uD558\uC138\uC694.',
    };
  }

  // Determine consent type for mixed jurisdictions
  let effectiveConsent = law.consentType;
  let safe = null;

  if (law.consentType === 'mixed' && law.twoPartyRegions) {
    const isTwoParty = law.twoPartyRegions.includes(region);
    effectiveConsent = isTwoParty ? 'two_party' : 'one_party';
    safe = !isTwoParty;
  } else if (law.consentType === 'state_mixed' && law.twoPartyRegions) {
    const isTwoParty = law.twoPartyRegions.includes(region);
    const isOneParty = law.onePartyRegions && law.onePartyRegions.includes(region);
    effectiveConsent = isTwoParty ? 'two_party' : isOneParty ? 'one_party' : 'unknown';
    safe = isOneParty ? true : isTwoParty ? false : null;
  } else if (law.consentType === 'one_party' || law.consentType === 'one_party_practice') {
    safe = true;
  } else if (law.consentType === 'two_party') {
    safe = false;
  } else {
    safe = null;
  }

  // Get context-specific guidance
  const ctx = law.contexts[scenario] || law.contexts['workplace'] || {};

  return {
    found: true,
    country: law.country,
    countryCode: law.code,
    emoji: law.emoji,
    consentType: effectiveConsent,
    safe,
    risk: ctx.risk || 'unknown',
    guide: ctx.guide || '',
    guideKo: ctx.guideKo || '',
    guideJa: ctx.guideJa || '',
    evidenceNote: law.evidenceNote || '',
    evidenceNoteKo: law.evidenceNoteKo || '',
    region,
    scenario,
  };
}

export function getRiskColor(risk) {
  switch (risk) {
    case 'low': return '#10B981';
    case 'medium': return '#FBBF24';
    case 'high': return '#FF5451';
    default: return '#8899AA';
  }
}

export function getRiskLabel(risk) {
  switch (risk) {
    case 'low': return 'Low Risk';
    case 'medium': return 'Medium Risk';
    case 'high': return 'High Risk';
    default: return 'Unknown';
  }
}

export function getConsentLabel(consentType) {
  switch (consentType) {
    case 'one_party': return 'One-party consent';
    case 'one_party_practice': return 'One-party (practice)';
    case 'two_party': return 'All-party consent required';
    case 'mixed': return 'Varies by region';
    case 'state_mixed': return 'Varies by state';
    case 'pdpa_contextual': return 'PDPA contextual rules';
    default: return 'Check local laws';
  }
}

// ============================================
// GPS Location Fetcher
// ============================================

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { error: 'GPS permission denied' };
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  const [geo] = await Location.reverseGeocodeAsync({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  });

  const countryCode = geo?.isoCountryCode || 'UNKNOWN';
  const region = geo?.region || '';
  const city = geo?.city || '';

  const legal = getLegalContext(countryCode, region, 'workplace');

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    country: legal.country,
    countryCode,
    region,
    city,
    emoji: legal.emoji,
    consentType: legal.consentType,
    safe: legal.safe,
    risk: legal.risk,
    guide: legal.guide,
    guideKo: legal.guideKo,
    guideJa: legal.guideJa,
    evidenceNote: legal.evidenceNote,
    evidenceNoteKo: legal.evidenceNoteKo,
    timestamp: new Date().toISOString(),
  };
}

