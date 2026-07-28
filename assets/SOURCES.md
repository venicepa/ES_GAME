# 資產來源

| 檔案 | 來源 | 授權 |
| --- | --- | --- |
| `enemy.glb` | [three.js](https://github.com/mrdoob/three.js) `examples/models/gltf/Soldier.glb`（r170） | three.js 本體 MIT，範例模型隨附於該 repo |
| `rifle.glb` | [Ultimate Guns Pack](https://poly.pizza/bundle/Ultimate-Guns-Pack-8SqbBcXqoS) by Quaternius — `Assault Rifle-Bgvuu4CUMV.glb` | **CC0（Public Domain）** |
| `pistol.glb` | 同上 — `Pistol.glb` | **CC0（Public Domain）** |
| `sniper.glb` | 同上 — `Sniper Rifle.glb` | **CC0（Public Domain）** |
| `shotgun.glb` | 同上 — `Shotgun.glb` | **CC0（Public Domain）** |

`enemy.glb` 是 Mixamo 骨架，內含 `Idle` / `Walk` / `Run` / `TPose` 動畫。

敵人手上的步槍不是額外的模型檔，是把 `rifle.glb` clone 後掛到 `mixamorig:RightHand` 骨骼上（`src/render-three.js` 的 `attachGun()`）。

Quaternius 的原始包共 25 把槍，換一把只要把對應的 `.glb` 複製成 `assets/rifle.glb`；長度和轉向由 `ASSETS` 的 `length` / `axes` 自動處理。

要商用發布的話，`enemy.glb` 的授權請自行再確認一次（CC0 的兩把槍沒有限制）。
