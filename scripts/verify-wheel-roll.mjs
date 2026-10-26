import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Quaternion, Vector3 } from 'three'
import { WHEEL_RADIUS_METERS, wheelRotation } from '../src/experience/wheels.ts'

const bytes = readFileSync(new URL(process.argv[2] ?? '../public/media/v23/cronos.glb', import.meta.url))
assert.equal(bytes.toString('ascii', 0, 4), 'glTF')
const jsonLength = bytes.readUInt32LE(12)
const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength))
const nodes = new Map(gltf.nodes.map(node => [node.name, node]))
const localAxle = new Vector3(0, 1, 0)
const bottom = new Vector3(0, 0, WHEEL_RADIUS_METERS)

for (const code of ['FL', 'FR', 'RL', 'RR']) {
  const pivot = nodes.get(`Wheel_${code}_Pivot`)
  const spin = nodes.get(`Wheel_${code}_Spin`)
  assert.ok(pivot && spin, `Missing ${code} wheel rig`)
  assert.ok(Math.abs(pivot.translation[1] - WHEEL_RADIUS_METERS) < .01, `${code} axle height`)
  const base = new Quaternion(...spin.rotation)
  const contact = bottom.clone().applyQuaternion(base)
  assert.ok(contact.y < -.30, `${code} wheel local Y must be its axle`)

  const forward = new Quaternion().setFromAxisAngle(localAxle, wheelRotation(.10))
  const reverse = new Quaternion().setFromAxisAngle(localAxle, wheelRotation(-.10))
  const forwardContact = bottom.clone().applyQuaternion(forward).applyQuaternion(base)
  const reverseContact = bottom.clone().applyQuaternion(reverse).applyQuaternion(base)
  assert.ok(forwardContact.x < contact.x, `${code} contact patch must move backward during forward travel`)
  assert.ok(reverseContact.x > contact.x, `${code} contact patch must move forward during reverse travel`)
}

console.log('Four wheel rigs verified: axle height, local axis, forward roll and reverse roll.')

