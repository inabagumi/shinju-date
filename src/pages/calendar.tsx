import chunk from 'lodash.chunk'
import { NextPage } from 'next'
import { NextSeo } from 'next-seo'
import React from 'react'
import Container from '@/components/atoms/Container'
import LinkButton from '@/components/atoms/LinkButton'
import Card, { CardHeader, CardFooter } from '@/components/molecules/Card'
import Grid, { Col, Row } from '@/components/molecules/Grid'
import Hero, { HeroTitle } from '@/components/organisms/Hero'

export const list = [
  {
    id: 'UC3EhsuKdEkI99TWZwZgWutg',
    name: '杏戸ゆげ'
  },
  {
    id: 'UC0Owc36U9lOyi9Gx9Ic-4qg',
    name: '因幡はねる'
  },
  {
    id: 'UCXp7sNC0F_qkjickvlYkg-Q',
    name: '風見くく'
  },
  {
    id: 'UCmqrvfLMws-GLGHQcB5dasg',
    name: '花奏かのん'
  },
  {
    id: 'UCL-2thbJ7grC9fmGF4OLuTg',
    name: '鴨見カモミ'
  },
  {
    id: 'UChXm-xAYPfygrbyLo2yCASQ',
    name: '季咲あんこ'
  },
  {
    id: 'UC0xhrAce06OkQfHBqAfLQAQ',
    name: '奇想天外あにびっと!'
  },
  {
    id: 'UCr83W-PdmmbstrvnCn9kdZQ',
    name: '銀猫ななし'
  },
  {
    id: 'UC8BS2IrE9NmxKLX7ObRVyxQ',
    name: '黒猫ななし'
  },
  {
    id: 'UCvPPBoTOor5gm8zSlE2tg4w',
    name: '虎城アンナ'
  },
  {
    id: 'UCzUNASdzI4PV5SlqtYwAkKQ',
    name: '小森めと'
  },
  {
    id: 'UCwePpiw1ocZRSNSkpKvVISw',
    name: '西園寺メアリ'
  },
  {
    id: 'UC--A2dwZW7-M2kID0N6_lfA',
    name: '獅子王クリス'
  },
  {
    id: 'UCYTz3uIgwVY3ZU-IQJS8r3A',
    name: '島村シャルロット'
  },
  {
    id: 'UCtzCQnCT9E4o6U3mHHSHbQQ',
    name: '白宮みみ'
  },
  {
    id: 'UCeLzT-7b2PBcunJplmWtoDg',
    name: '周防パトラ'
  },
  {
    id: 'UCDh2bWI5EDu7PavqwICkVpA',
    name: '堰代ミコ'
  },
  {
    id: 'UC2kyQhzGOB-JPgcQX9OMgEw',
    name: '宗谷いちか'
  },
  {
    id: 'UCgqQ5iuvUyPRHp3rBLuOtCw',
    name: '灰猫ななし'
  },
  {
    id: 'UCOgONfZgrG2g0jntQKa6cDw',
    name: '灰原あかね'
  },
  {
    id: 'UC_BlXOQe5OcRC7o0GX8kp8A',
    name: '羽柴なつみ'
  },
  {
    id: 'UCRvpMpzAXBRKJQuk-8-Sdvg',
    name: '日ノ隈らん'
  },
  {
    id: 'UCV4EoK6BVNl7wxuxpUvvSWA',
    name: '不磨わっと'
  },
  {
    id: 'UCoieZAlwgK3uLkIYiJARDQw',
    name: '三毛猫ななし'
  },
  {
    id: 'UCW8WKciBixmaqaGqrlTITRQ',
    name: '柚原いづみ'
  },
  {
    id: 'UC2hc-00y-MSR6eYA4eQ4tjQ',
    name: '龍ヶ崎リン'
  }
]

const Calendar: NextPage = () => (
  <>
    <NextSeo title="カレンダーリスト" />

    <Hero color="dark">
      <HeroTitle>カレンダーリスト</HeroTitle>
    </Hero>

    <Container className="padding-vert--xl">
      <Grid>
        {chunk(list, 3).map((items) => (
          <Row key={items.map((item) => item.id).join(':')}>
            {items.map((item) => {
              const url = `webcal://shinju.date/calendar/${item.id}.ics`

              return (
                <Col className="margin-bottom--lg" key={item.id} size={4}>
                  <Card>
                    <CardHeader>
                      <h4>{item.name}</h4>
                    </CardHeader>
                    <CardFooter>
                      <div className="button-group button-group--block">
                        <LinkButton
                          color="secondary"
                          href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(
                            url
                          )}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Android
                        </LinkButton>
                        <LinkButton
                          color="secondary"
                          href={url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          iOS
                        </LinkButton>
                      </div>
                    </CardFooter>
                  </Card>
                </Col>
              )
            })}
          </Row>
        ))}
        <Row></Row>
      </Grid>
    </Container>
  </>
)

export default Calendar
