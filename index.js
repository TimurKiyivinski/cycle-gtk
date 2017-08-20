#!/usr/bin/env jsgtk

const xs = require('xstream').default
const run = require('@cycle/run').run
const Gtk = require('Gtk')
const { h, makeGtkDriver } = require('./drivers/gtk')

function gtkShowAll (sink$) {
  sink$.addListener({
    next: ({ widget, options }) => {
      widget.showAll()
    }
  })
}

function app (sink$) {
  const quit$ = xs.create()

  sink$.addListener({
    next: ({ widget, options }) => {
      widget.resize(600, 400)

      widget.once('show', () => {
        widget.setKeepAbove(true)
      })

      widget.on('destroy', function quit () {
        quit$.shamefullySendNext(true)
      })
    }
  })

  return {
    quit$
  }
}

function main ({ gtk, app }) {
  const gtkWindow$ = gtk.select('#window')

  const showAll$ = xs.merge(
    gtkWindow$,
    gtk.select('#grid'),
    gtk.select('#stack'),
    gtk.select('#sidebar'),
    gtk.select('#button_first'),
    gtk.select('#button_second'),
    gtk.select('#button_third')
  )
    .endWhen(app.quit$)

  const timer$ = xs.periodic(1000)
    .map(function createTimerWindow (i) {
      function stackAddReducer (parent, child) {
        parent.attach(child, 1, 0, 1, 1)
        child.setVexpand(true)
        child.setHexpand(true)
      }

      function sidebarAddReducer (parent, child, widgets) {
        child.setStack(parent)
        widgets['#grid'].widget.attach(child, 0, 0, 1, 1)
      }

      function makeButtonAddReducer (key) {
        return function buttonAddReducer (parent, child) {
          parent.addTitled(child, `#sidebar_${key}`, `Page ${key} ${i}`)
        }
      }

      return h('Window', '#window', { title: 'jsgtk', type: Gtk.WindowType.TOPLEVEL, windowPosition: Gtk.WindowPosition.CENTER }, [
        h('Grid', '#grid', {}, [
          h('Stack', '#stack', { addReducer: stackAddReducer }, [
            h('StackSidebar', '#sidebar', { addReducer: sidebarAddReducer }),
            h('Button', '#button_first', { addReducer: makeButtonAddReducer('first'), label: `First ${i}` }),
            h('Button', '#button_second', { addReducer: makeButtonAddReducer('second'), label: `Second ${i}` }),
            h('Button', '#button_third', { addReducer: makeButtonAddReducer('third'), label: `Third ${i}` })
          ])
        ])
      ])
    })
    .endWhen(app.quit$)

  return {
    gtk: timer$,
    showAll: showAll$,
    app: gtkWindow$
  }
}

const drivers = {
  gtk: makeGtkDriver(),
  showAll: gtkShowAll,
  app
}

run(main, drivers)
