import { Server } from 'socket.io'

declare global {
  var io: Server
  var activeMidiInputs: { [key: string]: any }
  var artnetSender: any
}