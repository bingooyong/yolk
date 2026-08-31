# PRD — Phase 5 Mobile UI

## Problem

Yolk Rush overlays are portrait web sheets. On iPhone landscape the player must drag to reach PLAY, Settings clips 返回, and the 3D character is a leftover strip.

## Goal

Treat compact landscape (`orientation: landscape` and `max-height: 520px`) as the primary game chrome: left nav, center character, right dock/CTA. Zero accidental page scroll on Home / Play / Settings / Gacha / Victory.

## In

UI tokens, Hub/Settings/Gacha/Victory/Pause layout, landscape view-offset for showcase cameras.

## Out

Gameplay rules, gacha weights, Action Pad logic, Skin pipeline, animation clip mixer, new screens.
