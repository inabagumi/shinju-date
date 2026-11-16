import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  type AuditAction,
  Constants,
  type Enums,
  type FeatureRequestStatus,
  type Platform,
  type TalentStatus,
  type TwitchVideoType,
  type VideoBackfillJobStatus,
  type VideoDeletedReason,
  type VideoKind,
  type VideoStatus,
} from '../index.js'

describe('Constants', () => {
  it('exposes the values of platform_type at runtime', () => {
    expect(Constants.public.Enums.platform_type).toEqual(['youtube', 'twitch'])
  })
})

describe('named enum types', () => {
  it('match the values in Constants', () => {
    const { Enums: values } = Constants.public

    expectTypeOf<AuditAction>().toEqualTypeOf<
      (typeof values.audit_action)[number]
    >()
    expectTypeOf<FeatureRequestStatus>().toEqualTypeOf<
      (typeof values.feature_request_status)[number]
    >()
    expectTypeOf<Platform>().toEqualTypeOf<
      (typeof values.platform_type)[number]
    >()
    expectTypeOf<TalentStatus>().toEqualTypeOf<
      (typeof values.talent_status)[number]
    >()
    expectTypeOf<TwitchVideoType>().toEqualTypeOf<
      (typeof values.twitch_video_type)[number]
    >()
    expectTypeOf<VideoBackfillJobStatus>().toEqualTypeOf<
      (typeof values.video_backfill_job_status)[number]
    >()
    expectTypeOf<VideoDeletedReason>().toEqualTypeOf<
      (typeof values.video_deleted_reason)[number]
    >()
    expectTypeOf<VideoKind>().toEqualTypeOf<
      (typeof values.video_kind)[number]
    >()
    expectTypeOf<VideoStatus>().toEqualTypeOf<
      (typeof values.video_status)[number]
    >()
  })

  it('match the types from Enums', () => {
    expectTypeOf<Platform>().toEqualTypeOf<Enums<'platform_type'>>()
    expectTypeOf<Platform>().toEqualTypeOf<'youtube' | 'twitch'>()
  })
})
