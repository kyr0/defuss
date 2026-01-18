(module
  (type $t0 (func (param i32) (result i32)))
  (type $t1 (func (param i32 i32 i32 i32 i32)))
  (type $t2 (func (result i32)))
  (type $t3 (func (param i32)))
  (type $t4 (func))
  (type $t5 (func (param i32 i32 i32) (result f32)))
  (import "env" "emscripten_resize_heap" (func $env.emscripten_resize_heap (type $t0)))
  (func $__wasm_call_ctors (type $t4))
  (func $dot_product_serial_c_plain (type $t1) (param $p0 i32) (param $p1 i32) (param $p2 i32) (param $p3 i32) (param $p4 i32)
    (local $l5 i32) (local $l6 i32) (local $l7 i32) (local $l8 i32) (local $l9 i32) (local $l10 i32) (local $l11 i32) (local $l12 f32)
    block $B0
      local.get $p0
      i32.eqz
      br_if $B0
      local.get $p1
      i32.eqz
      br_if $B0
      local.get $p2
      i32.eqz
      br_if $B0
      local.get $p4
      i32.eqz
      br_if $B0
      local.get $p3
      i32.const -2
      i32.and
      local.set $l10
      local.get $p3
      i32.const 1
      i32.and
      local.set $l11
      loop $L1
        local.get $p3
        local.get $l6
        i32.mul
        local.set $l7
        f32.const 0x0p+0 (;=0;)
        local.set $l12
        i32.const 0
        local.set $l5
        i32.const 0
        local.set $l9
        block $B2
          block $B3
            block $B4
              local.get $p3
              br_table $B2 $B3 $B4
            end
            loop $L5
              local.get $p0
              local.get $l5
              i32.const 1
              i32.or
              local.get $l7
              i32.add
              i32.const 2
              i32.shl
              local.tee $l8
              i32.add
              f32.load
              local.get $p1
              local.get $l8
              i32.add
              f32.load
              f32.mul
              local.get $p0
              local.get $l5
              local.get $l7
              i32.add
              i32.const 2
              i32.shl
              local.tee $l8
              i32.add
              f32.load
              local.get $p1
              local.get $l8
              i32.add
              f32.load
              f32.mul
              local.get $l12
              f32.add
              f32.add
              local.set $l12
              local.get $l5
              i32.const 2
              i32.add
              local.set $l5
              local.get $l9
              i32.const 2
              i32.add
              local.tee $l9
              local.get $l10
              i32.ne
              br_if $L5
            end
          end
          local.get $l11
          i32.eqz
          br_if $B2
          local.get $p0
          local.get $l5
          local.get $l7
          i32.add
          i32.const 2
          i32.shl
          local.tee $l5
          i32.add
          f32.load
          local.get $p1
          local.get $l5
          i32.add
          f32.load
          f32.mul
          local.get $l12
          f32.add
          local.set $l12
        end
        local.get $p2
        local.get $l6
        i32.const 2
        i32.shl
        i32.add
        local.get $l12
        f32.store
        local.get $l6
        i32.const 1
        i32.add
        local.tee $l6
        local.get $p4
        i32.ne
        br_if $L1
      end
    end)
  (func $dot_product_c (type $t5) (param $p0 i32) (param $p1 i32) (param $p2 i32) (result f32)
    (local $l3 v128) (local $l4 i32) (local $l5 i32) (local $l6 i32) (local $l7 i32) (local $l8 i32) (local $l9 i32)
    block $B0
      local.get $p2
      i32.eqz
      if $I1
        br $B0
      end
      local.get $p2
      i32.const 1
      i32.sub
      i32.const 2
      i32.shr_u
      i32.const 1
      i32.add
      local.tee $l4
      i32.const 3
      i32.and
      local.set $l6
      block $B2
        local.get $p2
        i32.const 13
        i32.lt_u
        if $I3
          i32.const 0
          local.set $p2
          br $B2
        end
        local.get $l4
        i32.const 2147483644
        i32.and
        local.set $l9
        i32.const 0
        local.set $p2
        loop $L4
          local.get $l3
          local.get $p0
          local.get $p2
          i32.const 2
          i32.shl
          local.tee $l4
          i32.add
          v128.load align=1
          local.get $p1
          local.get $l4
          i32.add
          v128.load align=1
          f32x4.mul
          f32x4.add
          local.get $p0
          local.get $l4
          i32.const 16
          i32.or
          local.tee $l5
          i32.add
          v128.load align=1
          local.get $p1
          local.get $l5
          i32.add
          v128.load align=1
          f32x4.mul
          f32x4.add
          local.get $p0
          local.get $l4
          i32.const 32
          i32.or
          local.tee $l5
          i32.add
          v128.load align=1
          local.get $p1
          local.get $l5
          i32.add
          v128.load align=1
          f32x4.mul
          f32x4.add
          local.get $p0
          local.get $l4
          i32.const 48
          i32.or
          local.tee $l4
          i32.add
          v128.load align=1
          local.get $p1
          local.get $l4
          i32.add
          v128.load align=1
          f32x4.mul
          f32x4.add
          local.set $l3
          local.get $p2
          i32.const 16
          i32.add
          local.set $p2
          local.get $l8
          i32.const 4
          i32.add
          local.tee $l8
          local.get $l9
          i32.ne
          br_if $L4
        end
      end
      local.get $l6
      i32.eqz
      br_if $B0
      loop $L5
        local.get $l3
        local.get $p0
        local.get $p2
        i32.const 2
        i32.shl
        local.tee $l4
        i32.add
        v128.load align=1
        local.get $p1
        local.get $l4
        i32.add
        v128.load align=1
        f32x4.mul
        f32x4.add
        local.set $l3
        local.get $p2
        i32.const 4
        i32.add
        local.set $p2
        local.get $l7
        i32.const 1
        i32.add
        local.tee $l7
        local.get $l6
        i32.ne
        br_if $L5
      end
    end
    local.get $l3
    f32x4.extract_lane 3
    local.get $l3
    f32x4.extract_lane 2
    local.get $l3
    f32x4.extract_lane 0
    local.get $l3
    f32x4.extract_lane 1
    f32.add
    f32.add
    f32.add)
  (func $dot_product_serial_c (type $t1) (param $p0 i32) (param $p1 i32) (param $p2 i32) (param $p3 i32) (param $p4 i32)
    (local $l5 i32) (local $l6 i32) (local $l7 i32) (local $l8 i32) (local $l9 i32) (local $l10 i32) (local $l11 i32) (local $l12 i32) (local $l13 i32) (local $l14 i32) (local $l15 i32) (local $l16 i32) (local $l17 v128) (local $l18 v128) (local $l19 v128) (local $l20 v128)
    block $B0
      local.get $p0
      i32.eqz
      br_if $B0
      local.get $p1
      i32.eqz
      br_if $B0
      local.get $p2
      i32.eqz
      br_if $B0
      local.get $p4
      i32.const 4
      i32.ge_u
      if $I1
        local.get $p3
        i32.const -16
        i32.and
        local.set $l15
        local.get $p3
        i32.const 16
        i32.lt_u
        local.set $l16
        i32.const 3
        local.set $l12
        loop $L2
          block $B3
            block $B4 (result i32)
              local.get $l16
              if $I5
                v128.const i32x4 0x00000000 0x00000000 0x00000000 0x00000000
                local.tee $l17
                local.set $l19
                local.get $l17
                local.set $l20
                local.get $l17
                local.set $l18
                i32.const 0
                br $B4
              end
              local.get $p3
              local.get $l12
              i32.mul
              local.set $l9
              local.get $p3
              local.get $l8
              i32.mul
              local.set $l10
              local.get $l8
              i32.const 2
              i32.or
              local.get $p3
              i32.mul
              local.set $l11
              local.get $l8
              i32.const 1
              i32.or
              local.get $p3
              i32.mul
              local.set $l13
              i32.const 0
              local.set $l6
              v128.const i32x4 0x00000000 0x00000000 0x00000000 0x00000000
              local.tee $l18
              local.set $l20
              local.get $l18
              local.set $l19
              local.get $l18
              local.set $l17
              loop $L6
                local.get $l18
                local.get $p0
                local.get $l6
                local.get $l9
                i32.add
                i32.const 2
                i32.shl
                local.tee $l5
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l5
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 16
                i32.add
                local.tee $l7
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l7
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 32
                i32.add
                local.tee $l7
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l7
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 48
                i32.add
                local.tee $l5
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l5
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.set $l18
                local.get $l20
                local.get $p0
                local.get $l6
                local.get $l11
                i32.add
                i32.const 2
                i32.shl
                local.tee $l5
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l5
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 16
                i32.add
                local.tee $l7
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l7
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 32
                i32.add
                local.tee $l7
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l7
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 48
                i32.add
                local.tee $l5
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l5
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.set $l20
                local.get $l19
                local.get $p0
                local.get $l6
                local.get $l13
                i32.add
                i32.const 2
                i32.shl
                local.tee $l5
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l5
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 16
                i32.add
                local.tee $l7
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l7
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 32
                i32.add
                local.tee $l7
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l7
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 48
                i32.add
                local.tee $l5
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l5
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.set $l19
                local.get $l17
                local.get $p0
                local.get $l6
                local.get $l10
                i32.add
                i32.const 2
                i32.shl
                local.tee $l5
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l5
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 16
                i32.add
                local.tee $l7
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l7
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 32
                i32.add
                local.tee $l7
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l7
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.get $p0
                local.get $l5
                i32.const 48
                i32.add
                local.tee $l5
                i32.add
                v128.load align=1
                local.get $p1
                local.get $l5
                i32.add
                v128.load align=1
                f32x4.mul
                f32x4.add
                local.set $l17
                local.get $l6
                i32.const 16
                i32.add
                local.tee $l6
                i32.const 15
                i32.or
                local.get $p3
                i32.lt_u
                br_if $L6
              end
              local.get $l15
            end
            local.tee $l6
            local.get $p3
            i32.ge_u
            if $I7
              local.get $l8
              i32.const 2
              i32.or
              local.set $l13
              local.get $l8
              i32.const 1
              i32.or
              local.set $l14
              br $B3
            end
            local.get $p3
            local.get $l12
            i32.mul
            local.set $l7
            local.get $p3
            local.get $l8
            i32.mul
            local.set $l9
            local.get $l8
            i32.const 2
            i32.or
            local.tee $l13
            local.get $p3
            i32.mul
            local.set $l10
            local.get $l8
            i32.const 1
            i32.or
            local.tee $l14
            local.get $p3
            i32.mul
            local.set $l11
            loop $L8
              local.get $l18
              local.get $p0
              local.get $l6
              local.get $l7
              i32.add
              i32.const 2
              i32.shl
              local.tee $l5
              i32.add
              v128.load align=1
              local.get $p1
              local.get $l5
              i32.add
              v128.load align=1
              f32x4.mul
              f32x4.add
              local.set $l18
              local.get $l20
              local.get $p0
              local.get $l6
              local.get $l10
              i32.add
              i32.const 2
              i32.shl
              local.tee $l5
              i32.add
              v128.load align=1
              local.get $p1
              local.get $l5
              i32.add
              v128.load align=1
              f32x4.mul
              f32x4.add
              local.set $l20
              local.get $l19
              local.get $p0
              local.get $l6
              local.get $l11
              i32.add
              i32.const 2
              i32.shl
              local.tee $l5
              i32.add
              v128.load align=1
              local.get $p1
              local.get $l5
              i32.add
              v128.load align=1
              f32x4.mul
              f32x4.add
              local.set $l19
              local.get $l17
              local.get $p0
              local.get $l6
              local.get $l9
              i32.add
              i32.const 2
              i32.shl
              local.tee $l5
              i32.add
              v128.load align=1
              local.get $p1
              local.get $l5
              i32.add
              v128.load align=1
              f32x4.mul
              f32x4.add
              local.set $l17
              local.get $l6
              i32.const 4
              i32.add
              local.tee $l6
              local.get $p3
              i32.lt_u
              br_if $L8
            end
          end
          local.get $p2
          local.get $l8
          i32.const 2
          i32.shl
          i32.add
          local.get $l17
          f32x4.extract_lane 3
          local.get $l17
          f32x4.extract_lane 2
          local.get $l17
          f32x4.extract_lane 0
          local.get $l17
          f32x4.extract_lane 1
          f32.add
          f32.add
          f32.add
          f32.store
          local.get $p2
          local.get $l14
          i32.const 2
          i32.shl
          i32.add
          local.get $l19
          f32x4.extract_lane 3
          local.get $l19
          f32x4.extract_lane 2
          local.get $l19
          f32x4.extract_lane 0
          local.get $l19
          f32x4.extract_lane 1
          f32.add
          f32.add
          f32.add
          f32.store
          local.get $p2
          local.get $l13
          i32.const 2
          i32.shl
          i32.add
          local.get $l20
          f32x4.extract_lane 3
          local.get $l20
          f32x4.extract_lane 2
          local.get $l20
          f32x4.extract_lane 0
          local.get $l20
          f32x4.extract_lane 1
          f32.add
          f32.add
          f32.add
          f32.store
          local.get $p2
          local.get $l12
          i32.const 2
          i32.shl
          i32.add
          local.get $l18
          f32x4.extract_lane 3
          local.get $l18
          f32x4.extract_lane 2
          local.get $l18
          f32x4.extract_lane 0
          local.get $l18
          f32x4.extract_lane 1
          f32.add
          f32.add
          f32.add
          f32.store
          local.get $l8
          i32.const 4
          i32.add
          local.tee $l8
          i32.const 3
          i32.or
          local.tee $l12
          local.get $p4
          i32.lt_u
          br_if $L2
        end
      end
      local.get $p4
      local.get $l8
      i32.le_u
      br_if $B0
      local.get $p3
      i32.const -16
      i32.and
      local.set $l11
      local.get $p3
      i32.const 16
      i32.lt_u
      local.set $l10
      loop $L9
        block $B10 (result i32)
          local.get $l10
          if $I11
            v128.const i32x4 0x00000000 0x00000000 0x00000000 0x00000000
            local.set $l17
            i32.const 0
            br $B10
          end
          local.get $p3
          local.get $l8
          i32.mul
          local.set $l9
          v128.const i32x4 0x00000000 0x00000000 0x00000000 0x00000000
          local.set $l17
          i32.const 0
          local.set $l5
          loop $L12
            local.get $l17
            local.get $p0
            local.get $l5
            local.get $l9
            i32.add
            i32.const 2
            i32.shl
            local.tee $l6
            i32.add
            v128.load align=1
            local.get $p1
            local.get $l6
            i32.add
            v128.load align=1
            f32x4.mul
            f32x4.add
            local.get $p0
            local.get $l6
            i32.const 16
            i32.add
            local.tee $l7
            i32.add
            v128.load align=1
            local.get $p1
            local.get $l7
            i32.add
            v128.load align=1
            f32x4.mul
            f32x4.add
            local.get $p0
            local.get $l6
            i32.const 32
            i32.add
            local.tee $l7
            i32.add
            v128.load align=1
            local.get $p1
            local.get $l7
            i32.add
            v128.load align=1
            f32x4.mul
            f32x4.add
            local.get $p0
            local.get $l6
            i32.const 48
            i32.add
            local.tee $l6
            i32.add
            v128.load align=1
            local.get $p1
            local.get $l6
            i32.add
            v128.load align=1
            f32x4.mul
            f32x4.add
            local.set $l17
            local.get $l5
            i32.const 16
            i32.add
            local.tee $l5
            i32.const 15
            i32.or
            local.get $p3
            i32.lt_u
            br_if $L12
          end
          local.get $l11
        end
        local.tee $l6
        local.get $p3
        i32.lt_u
        if $I13
          local.get $p3
          local.get $l8
          i32.mul
          local.set $l7
          loop $L14
            local.get $l17
            local.get $p0
            local.get $l6
            local.get $l7
            i32.add
            i32.const 2
            i32.shl
            local.tee $l5
            i32.add
            v128.load align=1
            local.get $p1
            local.get $l5
            i32.add
            v128.load align=1
            f32x4.mul
            f32x4.add
            local.set $l17
            local.get $l6
            i32.const 4
            i32.add
            local.tee $l6
            local.get $p3
            i32.lt_u
            br_if $L14
          end
        end
        local.get $p2
        local.get $l8
        i32.const 2
        i32.shl
        i32.add
        local.get $l17
        f32x4.extract_lane 3
        local.get $l17
        f32x4.extract_lane 2
        local.get $l17
        f32x4.extract_lane 0
        local.get $l17
        f32x4.extract_lane 1
        f32.add
        f32.add
        f32.add
        f32.store
        local.get $l8
        i32.const 1
        i32.add
        local.tee $l8
        local.get $p4
        i32.ne
        br_if $L9
      end
    end)
  (func $__errno_location (type $t2) (result i32)
    i32.const 1028)
  (func $stackSave (type $t2) (result i32)
    global.get $g0)
  (func $stackRestore (type $t3) (param $p0 i32)
    local.get $p0
    global.set $g0)
  (func $stackAlloc (type $t0) (param $p0 i32) (result i32)
    global.get $g0
    local.get $p0
    i32.sub
    i32.const -16
    i32.and
    local.tee $p0
    global.set $g0
    local.get $p0)
  (func $f9 (type $t0) (param $p0 i32) (result i32)
    (local $l1 i32) (local $l2 i32)
    i32.const 1024
    i32.load
    local.tee $l1
    local.get $p0
    i32.const 7
    i32.add
    i32.const -8
    i32.and
    local.tee $l2
    i32.add
    local.set $p0
    block $B0
      local.get $l2
      i32.const 0
      local.get $p0
      local.get $l1
      i32.le_u
      select
      br_if $B0
      local.get $p0
      memory.size
      i32.const 16
      i32.shl
      i32.gt_u
      if $I1
        local.get $p0
        call $env.emscripten_resize_heap
        i32.eqz
        br_if $B0
      end
      i32.const 1024
      local.get $p0
      i32.store
      local.get $l1
      return
    end
    i32.const 1028
    i32.const 48
    i32.store
    i32.const -1)
  (func $malloc (type $t0) (param $p0 i32) (result i32)
    (local $l1 i32) (local $l2 i32) (local $l3 i32) (local $l4 i32) (local $l5 i32) (local $l6 i32) (local $l7 i32) (local $l8 i32) (local $l9 i32) (local $l10 i32) (local $l11 i32)
    global.get $g0
    i32.const 16
    i32.sub
    local.tee $l10
    global.set $g0
    block $B0
      block $B1
        block $B2
          block $B3
            block $B4
              block $B5
                block $B6
                  block $B7
                    block $B8
                      local.get $p0
                      i32.const 244
                      i32.le_u
                      if $I9
                        i32.const 1032
                        i32.load
                        local.tee $l6
                        i32.const 16
                        local.get $p0
                        i32.const 11
                        i32.add
                        i32.const -8
                        i32.and
                        local.get $p0
                        i32.const 11
                        i32.lt_u
                        select
                        local.tee $l4
                        i32.const 3
                        i32.shr_u
                        local.tee $l2
                        i32.shr_u
                        local.tee $p0
                        i32.const 3
                        i32.and
                        if $I10
                          block $B11
                            local.get $p0
                            i32.const -1
                            i32.xor
                            i32.const 1
                            i32.and
                            local.get $l2
                            i32.add
                            local.tee $l3
                            i32.const 3
                            i32.shl
                            local.tee $l2
                            i32.const 1072
                            i32.add
                            local.tee $p0
                            local.get $l2
                            i32.const 1080
                            i32.add
                            i32.load
                            local.tee $l2
                            i32.load offset=8
                            local.tee $l4
                            i32.eq
                            if $I12
                              i32.const 1032
                              local.get $l6
                              i32.const -2
                              local.get $l3
                              i32.rotl
                              i32.and
                              i32.store
                              br $B11
                            end
                            local.get $l4
                            local.get $p0
                            i32.store offset=12
                            local.get $p0
                            local.get $l4
                            i32.store offset=8
                          end
                          local.get $l2
                          i32.const 8
                          i32.add
                          local.set $p0
                          local.get $l2
                          local.get $l3
                          i32.const 3
                          i32.shl
                          local.tee $l3
                          i32.const 3
                          i32.or
                          i32.store offset=4
                          local.get $l2
                          local.get $l3
                          i32.add
                          local.tee $l2
                          local.get $l2
                          i32.load offset=4
                          i32.const 1
                          i32.or
                          i32.store offset=4
                          br $B0
                        end
                        local.get $l4
                        i32.const 1040
                        i32.load
                        local.tee $l8
                        i32.le_u
                        br_if $B8
                        local.get $p0
                        if $I13
                          block $B14
                            local.get $p0
                            local.get $l2
                            i32.shl
                            i32.const 2
                            local.get $l2
                            i32.shl
                            local.tee $p0
                            i32.const 0
                            local.get $p0
                            i32.sub
                            i32.or
                            i32.and
                            i32.ctz
                            local.tee $l2
                            i32.const 3
                            i32.shl
                            local.tee $p0
                            i32.const 1072
                            i32.add
                            local.tee $l3
                            local.get $p0
                            i32.const 1080
                            i32.add
                            i32.load
                            local.tee $p0
                            i32.load offset=8
                            local.tee $l1
                            i32.eq
                            if $I15
                              i32.const 1032
                              local.get $l6
                              i32.const -2
                              local.get $l2
                              i32.rotl
                              i32.and
                              local.tee $l6
                              i32.store
                              br $B14
                            end
                            local.get $l1
                            local.get $l3
                            i32.store offset=12
                            local.get $l3
                            local.get $l1
                            i32.store offset=8
                          end
                          local.get $p0
                          local.get $l4
                          i32.const 3
                          i32.or
                          i32.store offset=4
                          local.get $p0
                          local.get $l4
                          i32.add
                          local.tee $l1
                          local.get $l2
                          i32.const 3
                          i32.shl
                          local.tee $l2
                          local.get $l4
                          i32.sub
                          local.tee $l3
                          i32.const 1
                          i32.or
                          i32.store offset=4
                          local.get $p0
                          local.get $l2
                          i32.add
                          local.get $l3
                          i32.store
                          local.get $l8
                          if $I16
                            local.get $l8
                            i32.const -8
                            i32.and
                            i32.const 1072
                            i32.add
                            local.set $l4
                            i32.const 1052
                            i32.load
                            local.set $l2
                            block $B17 (result i32)
                              local.get $l6
                              i32.const 1
                              local.get $l8
                              i32.const 3
                              i32.shr_u
                              i32.shl
                              local.tee $l5
                              i32.and
                              i32.eqz
                              if $I18
                                i32.const 1032
                                local.get $l5
                                local.get $l6
                                i32.or
                                i32.store
                                local.get $l4
                                br $B17
                              end
                              local.get $l4
                              i32.load offset=8
                            end
                            local.set $l5
                            local.get $l4
                            local.get $l2
                            i32.store offset=8
                            local.get $l5
                            local.get $l2
                            i32.store offset=12
                            local.get $l2
                            local.get $l4
                            i32.store offset=12
                            local.get $l2
                            local.get $l5
                            i32.store offset=8
                          end
                          local.get $p0
                          i32.const 8
                          i32.add
                          local.set $p0
                          i32.const 1052
                          local.get $l1
                          i32.store
                          i32.const 1040
                          local.get $l3
                          i32.store
                          br $B0
                        end
                        i32.const 1036
                        i32.load
                        local.tee $l11
                        i32.eqz
                        br_if $B8
                        local.get $l11
                        i32.ctz
                        i32.const 2
                        i32.shl
                        i32.const 1336
                        i32.add
                        i32.load
                        local.tee $l1
                        i32.load offset=4
                        i32.const -8
                        i32.and
                        local.get $l4
                        i32.sub
                        local.set $l2
                        local.get $l1
                        local.set $l3
                        loop $L19
                          block $B20
                            local.get $l3
                            i32.load offset=16
                            local.tee $p0
                            i32.eqz
                            if $I21
                              local.get $l3
                              i32.load offset=20
                              local.tee $p0
                              i32.eqz
                              br_if $B20
                            end
                            local.get $p0
                            i32.load offset=4
                            i32.const -8
                            i32.and
                            local.get $l4
                            i32.sub
                            local.tee $l3
                            local.get $l2
                            local.get $l2
                            local.get $l3
                            i32.gt_u
                            local.tee $l3
                            select
                            local.set $l2
                            local.get $p0
                            local.get $l1
                            local.get $l3
                            select
                            local.set $l1
                            local.get $p0
                            local.set $l3
                            br $L19
                          end
                        end
                        local.get $l1
                        i32.load offset=24
                        local.set $l9
                        local.get $l1
                        local.get $l1
                        i32.load offset=12
                        local.tee $l5
                        i32.ne
                        if $I22
                          i32.const 1048
                          i32.load
                          drop
                          local.get $l1
                          i32.load offset=8
                          local.tee $p0
                          local.get $l5
                          i32.store offset=12
                          local.get $l5
                          local.get $p0
                          i32.store offset=8
                          br $B1
                        end
                        local.get $l1
                        i32.const 20
                        i32.add
                        local.tee $l3
                        i32.load
                        local.tee $p0
                        i32.eqz
                        if $I23
                          local.get $l1
                          i32.load offset=16
                          local.tee $p0
                          i32.eqz
                          br_if $B7
                          local.get $l1
                          i32.const 16
                          i32.add
                          local.set $l3
                        end
                        loop $L24
                          local.get $l3
                          local.set $l7
                          local.get $p0
                          local.tee $l5
                          i32.const 20
                          i32.add
                          local.tee $l3
                          i32.load
                          local.tee $p0
                          br_if $L24
                          local.get $l5
                          i32.const 16
                          i32.add
                          local.set $l3
                          local.get $l5
                          i32.load offset=16
                          local.tee $p0
                          br_if $L24
                        end
                        local.get $l7
                        i32.const 0
                        i32.store
                        br $B1
                      end
                      i32.const -1
                      local.set $l4
                      local.get $p0
                      i32.const -65
                      i32.gt_u
                      br_if $B8
                      local.get $p0
                      i32.const 11
                      i32.add
                      local.tee $p0
                      i32.const -8
                      i32.and
                      local.set $l4
                      i32.const 1036
                      i32.load
                      local.tee $l8
                      i32.eqz
                      br_if $B8
                      i32.const 0
                      local.get $l4
                      i32.sub
                      local.set $l2
                      block $B25
                        block $B26
                          block $B27
                            block $B28 (result i32)
                              i32.const 0
                              local.get $l4
                              i32.const 256
                              i32.lt_u
                              br_if $B28
                              drop
                              i32.const 31
                              local.get $l4
                              i32.const 16777215
                              i32.gt_u
                              br_if $B28
                              drop
                              local.get $l4
                              i32.const 38
                              local.get $p0
                              i32.const 8
                              i32.shr_u
                              i32.clz
                              local.tee $p0
                              i32.sub
                              i32.shr_u
                              i32.const 1
                              i32.and
                              local.get $p0
                              i32.const 1
                              i32.shl
                              i32.sub
                              i32.const 62
                              i32.add
                            end
                            local.tee $l7
                            i32.const 2
                            i32.shl
                            i32.const 1336
                            i32.add
                            i32.load
                            local.tee $l3
                            i32.eqz
                            if $I29
                              i32.const 0
                              local.set $p0
                              br $B27
                            end
                            i32.const 0
                            local.set $p0
                            local.get $l4
                            i32.const 25
                            local.get $l7
                            i32.const 1
                            i32.shr_u
                            i32.sub
                            i32.const 0
                            local.get $l7
                            i32.const 31
                            i32.ne
                            select
                            i32.shl
                            local.set $l1
                            loop $L30
                              block $B31
                                local.get $l3
                                i32.load offset=4
                                i32.const -8
                                i32.and
                                local.get $l4
                                i32.sub
                                local.tee $l6
                                local.get $l2
                                i32.ge_u
                                br_if $B31
                                local.get $l3
                                local.set $l5
                                local.get $l6
                                local.tee $l2
                                br_if $B31
                                i32.const 0
                                local.set $l2
                                local.get $l3
                                local.set $p0
                                br $B26
                              end
                              local.get $p0
                              local.get $l3
                              i32.load offset=20
                              local.tee $l6
                              local.get $l6
                              local.get $l3
                              local.get $l1
                              i32.const 29
                              i32.shr_u
                              i32.const 4
                              i32.and
                              i32.add
                              i32.load offset=16
                              local.tee $l3
                              i32.eq
                              select
                              local.get $p0
                              local.get $l6
                              select
                              local.set $p0
                              local.get $l1
                              i32.const 1
                              i32.shl
                              local.set $l1
                              local.get $l3
                              br_if $L30
                            end
                          end
                          local.get $p0
                          local.get $l5
                          i32.or
                          i32.eqz
                          if $I32
                            i32.const 0
                            local.set $l5
                            i32.const 2
                            local.get $l7
                            i32.shl
                            local.tee $p0
                            i32.const 0
                            local.get $p0
                            i32.sub
                            i32.or
                            local.get $l8
                            i32.and
                            local.tee $p0
                            i32.eqz
                            br_if $B8
                            local.get $p0
                            i32.ctz
                            i32.const 2
                            i32.shl
                            i32.const 1336
                            i32.add
                            i32.load
                            local.set $p0
                          end
                          local.get $p0
                          i32.eqz
                          br_if $B25
                        end
                        loop $L33
                          local.get $p0
                          i32.load offset=4
                          i32.const -8
                          i32.and
                          local.get $l4
                          i32.sub
                          local.tee $l6
                          local.get $l2
                          i32.lt_u
                          local.set $l1
                          local.get $l6
                          local.get $l2
                          local.get $l1
                          select
                          local.set $l2
                          local.get $p0
                          local.get $l5
                          local.get $l1
                          select
                          local.set $l5
                          local.get $p0
                          i32.load offset=16
                          local.tee $l3
                          if $I34 (result i32)
                            local.get $l3
                          else
                            local.get $p0
                            i32.load offset=20
                          end
                          local.tee $p0
                          br_if $L33
                        end
                      end
                      local.get $l5
                      i32.eqz
                      br_if $B8
                      local.get $l2
                      i32.const 1040
                      i32.load
                      local.get $l4
                      i32.sub
                      i32.ge_u
                      br_if $B8
                      local.get $l5
                      i32.load offset=24
                      local.set $l7
                      local.get $l5
                      local.get $l5
                      i32.load offset=12
                      local.tee $l1
                      i32.ne
                      if $I35
                        i32.const 1048
                        i32.load
                        drop
                        local.get $l5
                        i32.load offset=8
                        local.tee $p0
                        local.get $l1
                        i32.store offset=12
                        local.get $l1
                        local.get $p0
                        i32.store offset=8
                        br $B2
                      end
                      local.get $l5
                      i32.const 20
                      i32.add
                      local.tee $l3
                      i32.load
                      local.tee $p0
                      i32.eqz
                      if $I36
                        local.get $l5
                        i32.load offset=16
                        local.tee $p0
                        i32.eqz
                        br_if $B6
                        local.get $l5
                        i32.const 16
                        i32.add
                        local.set $l3
                      end
                      loop $L37
                        local.get $l3
                        local.set $l6
                        local.get $p0
                        local.tee $l1
                        i32.const 20
                        i32.add
                        local.tee $l3
                        i32.load
                        local.tee $p0
                        br_if $L37
                        local.get $l1
                        i32.const 16
                        i32.add
                        local.set $l3
                        local.get $l1
                        i32.load offset=16
                        local.tee $p0
                        br_if $L37
                      end
                      local.get $l6
                      i32.const 0
                      i32.store
                      br $B2
                    end
                    local.get $l4
                    i32.const 1040
                    i32.load
                    local.tee $p0
                    i32.le_u
                    if $I38
                      i32.const 1052
                      i32.load
                      local.set $l2
                      block $B39
                        local.get $p0
                        local.get $l4
                        i32.sub
                        local.tee $l3
                        i32.const 16
                        i32.ge_u
                        if $I40
                          local.get $l2
                          local.get $l4
                          i32.add
                          local.tee $l1
                          local.get $l3
                          i32.const 1
                          i32.or
                          i32.store offset=4
                          local.get $p0
                          local.get $l2
                          i32.add
                          local.get $l3
                          i32.store
                          local.get $l2
                          local.get $l4
                          i32.const 3
                          i32.or
                          i32.store offset=4
                          br $B39
                        end
                        local.get $l2
                        local.get $p0
                        i32.const 3
                        i32.or
                        i32.store offset=4
                        local.get $p0
                        local.get $l2
                        i32.add
                        local.tee $p0
                        local.get $p0
                        i32.load offset=4
                        i32.const 1
                        i32.or
                        i32.store offset=4
                        i32.const 0
                        local.set $l1
                        i32.const 0
                        local.set $l3
                      end
                      i32.const 1040
                      local.get $l3
                      i32.store
                      i32.const 1052
                      local.get $l1
                      i32.store
                      local.get $l2
                      i32.const 8
                      i32.add
                      local.set $p0
                      br $B0
                    end
                    local.get $l4
                    i32.const 1044
                    i32.load
                    local.tee $l1
                    i32.lt_u
                    if $I41
                      i32.const 1044
                      local.get $l1
                      local.get $l4
                      i32.sub
                      local.tee $l2
                      i32.store
                      i32.const 1056
                      i32.const 1056
                      i32.load
                      local.tee $p0
                      local.get $l4
                      i32.add
                      local.tee $l3
                      i32.store
                      local.get $l3
                      local.get $l2
                      i32.const 1
                      i32.or
                      i32.store offset=4
                      local.get $p0
                      local.get $l4
                      i32.const 3
                      i32.or
                      i32.store offset=4
                      local.get $p0
                      i32.const 8
                      i32.add
                      local.set $p0
                      br $B0
                    end
                    i32.const 0
                    local.set $p0
                    local.get $l4
                    i32.const 47
                    i32.add
                    local.tee $l8
                    block $B42 (result i32)
                      i32.const 1504
                      i32.load
                      if $I43
                        i32.const 1512
                        i32.load
                        br $B42
                      end
                      i32.const 1516
                      i64.const -1
                      i64.store align=4
                      i32.const 1508
                      i64.const 17592186048512
                      i64.store align=4
                      i32.const 1504
                      local.get $l10
                      i32.const 12
                      i32.add
                      i32.const -16
                      i32.and
                      i32.const 1431655768
                      i32.xor
                      i32.store
                      i32.const 1524
                      i32.const 0
                      i32.store
                      i32.const 1476
                      i32.const 0
                      i32.store
                      i32.const 4096
                    end
                    local.tee $l2
                    i32.add
                    local.tee $l6
                    i32.const 0
                    local.get $l2
                    i32.sub
                    local.tee $l7
                    i32.and
                    local.tee $l5
                    local.get $l4
                    i32.le_u
                    br_if $B0
                    i32.const 1472
                    i32.load
                    local.tee $l2
                    if $I44
                      i32.const 1464
                      i32.load
                      local.tee $l3
                      local.get $l5
                      i32.add
                      local.tee $l9
                      local.get $l3
                      i32.le_u
                      br_if $B0
                      local.get $l2
                      local.get $l9
                      i32.lt_u
                      br_if $B0
                    end
                    block $B45
                      i32.const 1476
                      i32.load8_u
                      i32.const 4
                      i32.and
                      i32.eqz
                      if $I46
                        block $B47
                          block $B48
                            block $B49
                              block $B50
                                i32.const 1056
                                i32.load
                                local.tee $l2
                                if $I51
                                  i32.const 1480
                                  local.set $p0
                                  loop $L52
                                    local.get $l2
                                    local.get $p0
                                    i32.load
                                    local.tee $l3
                                    i32.ge_u
                                    if $I53
                                      local.get $l3
                                      local.get $p0
                                      i32.load offset=4
                                      i32.add
                                      local.get $l2
                                      i32.gt_u
                                      br_if $B50
                                    end
                                    local.get $p0
                                    i32.load offset=8
                                    local.tee $p0
                                    br_if $L52
                                  end
                                end
                                i32.const 0
                                call $f9
                                local.tee $l1
                                i32.const -1
                                i32.eq
                                br_if $B47
                                local.get $l5
                                local.set $l6
                                i32.const 1508
                                i32.load
                                local.tee $p0
                                i32.const 1
                                i32.sub
                                local.tee $l2
                                local.get $l1
                                i32.and
                                if $I54
                                  local.get $l5
                                  local.get $l1
                                  i32.sub
                                  local.get $l1
                                  local.get $l2
                                  i32.add
                                  i32.const 0
                                  local.get $p0
                                  i32.sub
                                  i32.and
                                  i32.add
                                  local.set $l6
                                end
                                local.get $l4
                                local.get $l6
                                i32.ge_u
                                br_if $B47
                                i32.const 1472
                                i32.load
                                local.tee $p0
                                if $I55
                                  i32.const 1464
                                  i32.load
                                  local.tee $l2
                                  local.get $l6
                                  i32.add
                                  local.tee $l3
                                  local.get $l2
                                  i32.le_u
                                  br_if $B47
                                  local.get $p0
                                  local.get $l3
                                  i32.lt_u
                                  br_if $B47
                                end
                                local.get $l6
                                call $f9
                                local.tee $p0
                                local.get $l1
                                i32.ne
                                br_if $B49
                                br $B45
                              end
                              local.get $l6
                              local.get $l1
                              i32.sub
                              local.get $l7
                              i32.and
                              local.tee $l6
                              call $f9
                              local.tee $l1
                              local.get $p0
                              i32.load
                              local.get $p0
                              i32.load offset=4
                              i32.add
                              i32.eq
                              br_if $B48
                              local.get $l1
                              local.set $p0
                            end
                            local.get $p0
                            i32.const -1
                            i32.eq
                            br_if $B47
                            local.get $l4
                            i32.const 48
                            i32.add
                            local.get $l6
                            i32.le_u
                            if $I56
                              local.get $p0
                              local.set $l1
                              br $B45
                            end
                            i32.const 1512
                            i32.load
                            local.tee $l2
                            local.get $l8
                            local.get $l6
                            i32.sub
                            i32.add
                            i32.const 0
                            local.get $l2
                            i32.sub
                            i32.and
                            local.tee $l2
                            call $f9
                            i32.const -1
                            i32.eq
                            br_if $B47
                            local.get $l2
                            local.get $l6
                            i32.add
                            local.set $l6
                            local.get $p0
                            local.set $l1
                            br $B45
                          end
                          local.get $l1
                          i32.const -1
                          i32.ne
                          br_if $B45
                        end
                        i32.const 1476
                        i32.const 1476
                        i32.load
                        i32.const 4
                        i32.or
                        i32.store
                      end
                      local.get $l5
                      call $f9
                      local.set $l1
                      i32.const 0
                      call $f9
                      local.set $p0
                      local.get $l1
                      i32.const -1
                      i32.eq
                      br_if $B3
                      local.get $p0
                      i32.const -1
                      i32.eq
                      br_if $B3
                      local.get $p0
                      local.get $l1
                      i32.le_u
                      br_if $B3
                      local.get $p0
                      local.get $l1
                      i32.sub
                      local.tee $l6
                      local.get $l4
                      i32.const 40
                      i32.add
                      i32.le_u
                      br_if $B3
                    end
                    i32.const 1464
                    i32.const 1464
                    i32.load
                    local.get $l6
                    i32.add
                    local.tee $p0
                    i32.store
                    i32.const 1468
                    i32.load
                    local.get $p0
                    i32.lt_u
                    if $I57
                      i32.const 1468
                      local.get $p0
                      i32.store
                    end
                    block $B58
                      i32.const 1056
                      i32.load
                      local.tee $l2
                      if $I59
                        i32.const 1480
                        local.set $p0
                        loop $L60
                          local.get $l1
                          local.get $p0
                          i32.load
                          local.tee $l3
                          local.get $p0
                          i32.load offset=4
                          local.tee $l5
                          i32.add
                          i32.eq
                          br_if $B58
                          local.get $p0
                          i32.load offset=8
                          local.tee $p0
                          br_if $L60
                        end
                        br $B5
                      end
                      i32.const 1048
                      i32.load
                      local.tee $p0
                      i32.const 0
                      local.get $p0
                      local.get $l1
                      i32.le_u
                      select
                      i32.eqz
                      if $I61
                        i32.const 1048
                        local.get $l1
                        i32.store
                      end
                      i32.const 0
                      local.set $p0
                      i32.const 1484
                      local.get $l6
                      i32.store
                      i32.const 1480
                      local.get $l1
                      i32.store
                      i32.const 1064
                      i32.const -1
                      i32.store
                      i32.const 1068
                      i32.const 1504
                      i32.load
                      i32.store
                      i32.const 1492
                      i32.const 0
                      i32.store
                      loop $L62
                        local.get $p0
                        i32.const 3
                        i32.shl
                        local.tee $l2
                        i32.const 1080
                        i32.add
                        local.get $l2
                        i32.const 1072
                        i32.add
                        local.tee $l3
                        i32.store
                        local.get $l2
                        i32.const 1084
                        i32.add
                        local.get $l3
                        i32.store
                        local.get $p0
                        i32.const 1
                        i32.add
                        local.tee $p0
                        i32.const 32
                        i32.ne
                        br_if $L62
                      end
                      i32.const 1044
                      local.get $l6
                      i32.const 40
                      i32.sub
                      local.tee $p0
                      i32.const -8
                      local.get $l1
                      i32.sub
                      i32.const 7
                      i32.and
                      local.tee $l2
                      i32.sub
                      local.tee $l3
                      i32.store
                      i32.const 1056
                      local.get $l1
                      local.get $l2
                      i32.add
                      local.tee $l2
                      i32.store
                      local.get $l2
                      local.get $l3
                      i32.const 1
                      i32.or
                      i32.store offset=4
                      local.get $p0
                      local.get $l1
                      i32.add
                      i32.const 40
                      i32.store offset=4
                      i32.const 1060
                      i32.const 1520
                      i32.load
                      i32.store
                      br $B4
                    end
                    local.get $l1
                    local.get $l2
                    i32.le_u
                    br_if $B5
                    local.get $l2
                    local.get $l3
                    i32.lt_u
                    br_if $B5
                    local.get $p0
                    i32.load offset=12
                    i32.const 8
                    i32.and
                    br_if $B5
                    local.get $p0
                    local.get $l5
                    local.get $l6
                    i32.add
                    i32.store offset=4
                    i32.const 1056
                    local.get $l2
                    i32.const -8
                    local.get $l2
                    i32.sub
                    i32.const 7
                    i32.and
                    local.tee $p0
                    i32.add
                    local.tee $l3
                    i32.store
                    i32.const 1044
                    i32.const 1044
                    i32.load
                    local.get $l6
                    i32.add
                    local.tee $l1
                    local.get $p0
                    i32.sub
                    local.tee $p0
                    i32.store
                    local.get $l3
                    local.get $p0
                    i32.const 1
                    i32.or
                    i32.store offset=4
                    local.get $l1
                    local.get $l2
                    i32.add
                    i32.const 40
                    i32.store offset=4
                    i32.const 1060
                    i32.const 1520
                    i32.load
                    i32.store
                    br $B4
                  end
                  i32.const 0
                  local.set $l5
                  br $B1
                end
                i32.const 0
                local.set $l1
                br $B2
              end
              i32.const 1048
              i32.load
              local.get $l1
              i32.gt_u
              if $I63
                i32.const 1048
                local.get $l1
                i32.store
              end
              local.get $l1
              local.get $l6
              i32.add
              local.set $l3
              i32.const 1480
              local.set $p0
              block $B64
                block $B65
                  block $B66
                    loop $L67
                      local.get $l3
                      local.get $p0
                      i32.load
                      i32.ne
                      if $I68
                        local.get $p0
                        i32.load offset=8
                        local.tee $p0
                        br_if $L67
                        br $B66
                      end
                    end
                    local.get $p0
                    i32.load8_u offset=12
                    i32.const 8
                    i32.and
                    i32.eqz
                    br_if $B65
                  end
                  i32.const 1480
                  local.set $p0
                  loop $L69
                    block $B70
                      local.get $l2
                      local.get $p0
                      i32.load
                      local.tee $l3
                      i32.ge_u
                      if $I71
                        local.get $l3
                        local.get $p0
                        i32.load offset=4
                        i32.add
                        local.tee $l3
                        local.get $l2
                        i32.gt_u
                        br_if $B70
                      end
                      local.get $p0
                      i32.load offset=8
                      local.set $p0
                      br $L69
                    end
                  end
                  i32.const 1044
                  local.get $l6
                  i32.const 40
                  i32.sub
                  local.tee $p0
                  i32.const -8
                  local.get $l1
                  i32.sub
                  i32.const 7
                  i32.and
                  local.tee $l5
                  i32.sub
                  local.tee $l7
                  i32.store
                  i32.const 1056
                  local.get $l1
                  local.get $l5
                  i32.add
                  local.tee $l5
                  i32.store
                  local.get $l5
                  local.get $l7
                  i32.const 1
                  i32.or
                  i32.store offset=4
                  local.get $p0
                  local.get $l1
                  i32.add
                  i32.const 40
                  i32.store offset=4
                  i32.const 1060
                  i32.const 1520
                  i32.load
                  i32.store
                  local.get $l2
                  local.get $l3
                  i32.const 39
                  local.get $l3
                  i32.sub
                  i32.const 7
                  i32.and
                  i32.add
                  i32.const 47
                  i32.sub
                  local.tee $p0
                  local.get $p0
                  local.get $l2
                  i32.const 16
                  i32.add
                  i32.lt_u
                  select
                  local.tee $l5
                  i32.const 27
                  i32.store offset=4
                  local.get $l5
                  i32.const 1488
                  i64.load align=4
                  i64.store offset=16 align=4
                  local.get $l5
                  i32.const 1480
                  i64.load align=4
                  i64.store offset=8 align=4
                  i32.const 1488
                  local.get $l5
                  i32.const 8
                  i32.add
                  i32.store
                  i32.const 1484
                  local.get $l6
                  i32.store
                  i32.const 1480
                  local.get $l1
                  i32.store
                  i32.const 1492
                  i32.const 0
                  i32.store
                  local.get $l5
                  i32.const 24
                  i32.add
                  local.set $p0
                  loop $L72
                    local.get $p0
                    i32.const 7
                    i32.store offset=4
                    local.get $p0
                    i32.const 8
                    i32.add
                    local.set $l1
                    local.get $p0
                    i32.const 4
                    i32.add
                    local.set $p0
                    local.get $l1
                    local.get $l3
                    i32.lt_u
                    br_if $L72
                  end
                  local.get $l2
                  local.get $l5
                  i32.eq
                  br_if $B4
                  local.get $l5
                  local.get $l5
                  i32.load offset=4
                  i32.const -2
                  i32.and
                  i32.store offset=4
                  local.get $l2
                  local.get $l5
                  local.get $l2
                  i32.sub
                  local.tee $l1
                  i32.const 1
                  i32.or
                  i32.store offset=4
                  local.get $l5
                  local.get $l1
                  i32.store
                  local.get $l1
                  i32.const 255
                  i32.le_u
                  if $I73
                    local.get $l1
                    i32.const -8
                    i32.and
                    i32.const 1072
                    i32.add
                    local.set $p0
                    block $B74 (result i32)
                      i32.const 1032
                      i32.load
                      local.tee $l3
                      i32.const 1
                      local.get $l1
                      i32.const 3
                      i32.shr_u
                      i32.shl
                      local.tee $l1
                      i32.and
                      i32.eqz
                      if $I75
                        i32.const 1032
                        local.get $l1
                        local.get $l3
                        i32.or
                        i32.store
                        local.get $p0
                        br $B74
                      end
                      local.get $p0
                      i32.load offset=8
                    end
                    local.set $l3
                    local.get $p0
                    local.get $l2
                    i32.store offset=8
                    local.get $l3
                    local.get $l2
                    i32.store offset=12
                    local.get $l2
                    local.get $p0
                    i32.store offset=12
                    local.get $l2
                    local.get $l3
                    i32.store offset=8
                    br $B4
                  end
                  i32.const 31
                  local.set $p0
                  local.get $l1
                  i32.const 16777215
                  i32.le_u
                  if $I76
                    local.get $l1
                    i32.const 38
                    local.get $l1
                    i32.const 8
                    i32.shr_u
                    i32.clz
                    local.tee $p0
                    i32.sub
                    i32.shr_u
                    i32.const 1
                    i32.and
                    local.get $p0
                    i32.const 1
                    i32.shl
                    i32.sub
                    i32.const 62
                    i32.add
                    local.set $p0
                  end
                  local.get $l2
                  local.get $p0
                  i32.store offset=28
                  local.get $l2
                  i64.const 0
                  i64.store offset=16 align=4
                  local.get $p0
                  i32.const 2
                  i32.shl
                  i32.const 1336
                  i32.add
                  local.set $l3
                  block $B77
                    i32.const 1036
                    i32.load
                    local.tee $l5
                    i32.const 1
                    local.get $p0
                    i32.shl
                    local.tee $l6
                    i32.and
                    i32.eqz
                    if $I78
                      i32.const 1036
                      local.get $l5
                      local.get $l6
                      i32.or
                      i32.store
                      local.get $l3
                      local.get $l2
                      i32.store
                      local.get $l2
                      local.get $l3
                      i32.store offset=24
                      br $B77
                    end
                    local.get $l1
                    i32.const 25
                    local.get $p0
                    i32.const 1
                    i32.shr_u
                    i32.sub
                    i32.const 0
                    local.get $p0
                    i32.const 31
                    i32.ne
                    select
                    i32.shl
                    local.set $p0
                    local.get $l3
                    i32.load
                    local.set $l5
                    loop $L79
                      local.get $l5
                      local.tee $l3
                      i32.load offset=4
                      i32.const -8
                      i32.and
                      local.get $l1
                      i32.eq
                      br_if $B64
                      local.get $p0
                      i32.const 29
                      i32.shr_u
                      local.set $l5
                      local.get $p0
                      i32.const 1
                      i32.shl
                      local.set $p0
                      local.get $l3
                      local.get $l5
                      i32.const 4
                      i32.and
                      i32.add
                      i32.const 16
                      i32.add
                      local.tee $l6
                      i32.load
                      local.tee $l5
                      br_if $L79
                    end
                    local.get $l6
                    local.get $l2
                    i32.store
                    local.get $l2
                    local.get $l3
                    i32.store offset=24
                  end
                  local.get $l2
                  local.get $l2
                  i32.store offset=12
                  local.get $l2
                  local.get $l2
                  i32.store offset=8
                  br $B4
                end
                local.get $p0
                local.get $l1
                i32.store
                local.get $p0
                local.get $p0
                i32.load offset=4
                local.get $l6
                i32.add
                i32.store offset=4
                local.get $l1
                i32.const -8
                local.get $l1
                i32.sub
                i32.const 7
                i32.and
                i32.add
                local.tee $l9
                local.get $l4
                i32.const 3
                i32.or
                i32.store offset=4
                local.get $l3
                i32.const -8
                local.get $l3
                i32.sub
                i32.const 7
                i32.and
                i32.add
                local.tee $l2
                local.get $l4
                local.get $l9
                i32.add
                local.tee $l6
                i32.sub
                local.set $l4
                block $B80
                  i32.const 1056
                  i32.load
                  local.get $l2
                  i32.eq
                  if $I81
                    i32.const 1056
                    local.get $l6
                    i32.store
                    i32.const 1044
                    i32.const 1044
                    i32.load
                    local.get $l4
                    i32.add
                    local.tee $l4
                    i32.store
                    local.get $l6
                    local.get $l4
                    i32.const 1
                    i32.or
                    i32.store offset=4
                    br $B80
                  end
                  i32.const 1052
                  i32.load
                  local.get $l2
                  i32.eq
                  if $I82
                    i32.const 1052
                    local.get $l6
                    i32.store
                    i32.const 1040
                    i32.const 1040
                    i32.load
                    local.get $l4
                    i32.add
                    local.tee $l4
                    i32.store
                    local.get $l6
                    local.get $l4
                    i32.const 1
                    i32.or
                    i32.store offset=4
                    local.get $l4
                    local.get $l6
                    i32.add
                    local.get $l4
                    i32.store
                    br $B80
                  end
                  local.get $l2
                  i32.load offset=4
                  local.tee $l1
                  i32.const 3
                  i32.and
                  i32.const 1
                  i32.eq
                  if $I83
                    local.get $l1
                    i32.const -8
                    i32.and
                    local.set $l8
                    block $B84
                      local.get $l1
                      i32.const 255
                      i32.le_u
                      if $I85
                        local.get $l1
                        i32.const 3
                        i32.shr_u
                        local.set $l5
                        local.get $l2
                        i32.load offset=12
                        local.tee $l1
                        local.get $l2
                        i32.load offset=8
                        local.tee $l3
                        i32.eq
                        if $I86
                          i32.const 1032
                          i32.const 1032
                          i32.load
                          i32.const -2
                          local.get $l5
                          i32.rotl
                          i32.and
                          i32.store
                          br $B84
                        end
                        local.get $l3
                        local.get $l1
                        i32.store offset=12
                        local.get $l1
                        local.get $l3
                        i32.store offset=8
                        br $B84
                      end
                      local.get $l2
                      i32.load offset=24
                      local.set $l7
                      block $B87
                        local.get $l2
                        local.get $l2
                        i32.load offset=12
                        local.tee $p0
                        i32.ne
                        if $I88
                          i32.const 1048
                          i32.load
                          drop
                          local.get $l2
                          i32.load offset=8
                          local.tee $l1
                          local.get $p0
                          i32.store offset=12
                          local.get $p0
                          local.get $l1
                          i32.store offset=8
                          br $B87
                        end
                        block $B89
                          local.get $l2
                          i32.const 20
                          i32.add
                          local.tee $l3
                          i32.load
                          local.tee $l1
                          i32.eqz
                          if $I90
                            local.get $l2
                            i32.load offset=16
                            local.tee $l1
                            i32.eqz
                            br_if $B89
                            local.get $l2
                            i32.const 16
                            i32.add
                            local.set $l3
                          end
                          loop $L91
                            local.get $l3
                            local.set $l5
                            local.get $l1
                            local.tee $p0
                            i32.const 20
                            i32.add
                            local.tee $l3
                            i32.load
                            local.tee $l1
                            br_if $L91
                            local.get $p0
                            i32.const 16
                            i32.add
                            local.set $l3
                            local.get $p0
                            i32.load offset=16
                            local.tee $l1
                            br_if $L91
                          end
                          local.get $l5
                          i32.const 0
                          i32.store
                          br $B87
                        end
                        i32.const 0
                        local.set $p0
                      end
                      local.get $l7
                      i32.eqz
                      br_if $B84
                      block $B92
                        local.get $l2
                        i32.load offset=28
                        local.tee $l3
                        i32.const 2
                        i32.shl
                        i32.const 1336
                        i32.add
                        local.tee $l1
                        i32.load
                        local.get $l2
                        i32.eq
                        if $I93
                          local.get $l1
                          local.get $p0
                          i32.store
                          local.get $p0
                          br_if $B92
                          i32.const 1036
                          i32.const 1036
                          i32.load
                          i32.const -2
                          local.get $l3
                          i32.rotl
                          i32.and
                          i32.store
                          br $B84
                        end
                        local.get $l7
                        i32.const 16
                        i32.const 20
                        local.get $l7
                        i32.load offset=16
                        local.get $l2
                        i32.eq
                        select
                        i32.add
                        local.get $p0
                        i32.store
                        local.get $p0
                        i32.eqz
                        br_if $B84
                      end
                      local.get $p0
                      local.get $l7
                      i32.store offset=24
                      local.get $l2
                      i32.load offset=16
                      local.tee $l1
                      if $I94
                        local.get $p0
                        local.get $l1
                        i32.store offset=16
                        local.get $l1
                        local.get $p0
                        i32.store offset=24
                      end
                      local.get $l2
                      i32.load offset=20
                      local.tee $l1
                      i32.eqz
                      br_if $B84
                      local.get $p0
                      local.get $l1
                      i32.store offset=20
                      local.get $l1
                      local.get $p0
                      i32.store offset=24
                    end
                    local.get $l4
                    local.get $l8
                    i32.add
                    local.set $l4
                    local.get $l2
                    local.get $l8
                    i32.add
                    local.tee $l2
                    i32.load offset=4
                    local.set $l1
                  end
                  local.get $l2
                  local.get $l1
                  i32.const -2
                  i32.and
                  i32.store offset=4
                  local.get $l6
                  local.get $l4
                  i32.const 1
                  i32.or
                  i32.store offset=4
                  local.get $l4
                  local.get $l6
                  i32.add
                  local.get $l4
                  i32.store
                  local.get $l4
                  i32.const 255
                  i32.le_u
                  if $I95
                    local.get $l4
                    i32.const -8
                    i32.and
                    i32.const 1072
                    i32.add
                    local.set $l1
                    block $B96 (result i32)
                      i32.const 1032
                      i32.load
                      local.tee $l3
                      i32.const 1
                      local.get $l4
                      i32.const 3
                      i32.shr_u
                      i32.shl
                      local.tee $l4
                      i32.and
                      i32.eqz
                      if $I97
                        i32.const 1032
                        local.get $l3
                        local.get $l4
                        i32.or
                        i32.store
                        local.get $l1
                        br $B96
                      end
                      local.get $l1
                      i32.load offset=8
                    end
                    local.set $l4
                    local.get $l1
                    local.get $l6
                    i32.store offset=8
                    local.get $l4
                    local.get $l6
                    i32.store offset=12
                    local.get $l6
                    local.get $l1
                    i32.store offset=12
                    local.get $l6
                    local.get $l4
                    i32.store offset=8
                    br $B80
                  end
                  i32.const 31
                  local.set $l1
                  local.get $l4
                  i32.const 16777215
                  i32.le_u
                  if $I98
                    local.get $l4
                    i32.const 38
                    local.get $l4
                    i32.const 8
                    i32.shr_u
                    i32.clz
                    local.tee $l1
                    i32.sub
                    i32.shr_u
                    i32.const 1
                    i32.and
                    local.get $l1
                    i32.const 1
                    i32.shl
                    i32.sub
                    i32.const 62
                    i32.add
                    local.set $l1
                  end
                  local.get $l6
                  local.get $l1
                  i32.store offset=28
                  local.get $l6
                  i64.const 0
                  i64.store offset=16 align=4
                  local.get $l1
                  i32.const 2
                  i32.shl
                  i32.const 1336
                  i32.add
                  local.set $l3
                  block $B99
                    block $B100
                      i32.const 1036
                      i32.load
                      local.tee $p0
                      i32.const 1
                      local.get $l1
                      i32.shl
                      local.tee $l2
                      i32.and
                      i32.eqz
                      if $I101
                        i32.const 1036
                        local.get $p0
                        local.get $l2
                        i32.or
                        i32.store
                        local.get $l3
                        local.get $l6
                        i32.store
                        local.get $l6
                        local.get $l3
                        i32.store offset=24
                        br $B100
                      end
                      local.get $l4
                      i32.const 25
                      local.get $l1
                      i32.const 1
                      i32.shr_u
                      i32.sub
                      i32.const 0
                      local.get $l1
                      i32.const 31
                      i32.ne
                      select
                      i32.shl
                      local.set $l1
                      local.get $l3
                      i32.load
                      local.set $p0
                      loop $L102
                        local.get $p0
                        local.tee $l3
                        i32.load offset=4
                        i32.const -8
                        i32.and
                        local.get $l4
                        i32.eq
                        br_if $B99
                        local.get $l1
                        i32.const 29
                        i32.shr_u
                        local.set $p0
                        local.get $l1
                        i32.const 1
                        i32.shl
                        local.set $l1
                        local.get $l3
                        local.get $p0
                        i32.const 4
                        i32.and
                        i32.add
                        i32.const 16
                        i32.add
                        local.tee $l2
                        i32.load
                        local.tee $p0
                        br_if $L102
                      end
                      local.get $l2
                      local.get $l6
                      i32.store
                      local.get $l6
                      local.get $l3
                      i32.store offset=24
                    end
                    local.get $l6
                    local.get $l6
                    i32.store offset=12
                    local.get $l6
                    local.get $l6
                    i32.store offset=8
                    br $B80
                  end
                  local.get $l3
                  i32.load offset=8
                  local.tee $l4
                  local.get $l6
                  i32.store offset=12
                  local.get $l3
                  local.get $l6
                  i32.store offset=8
                  local.get $l6
                  i32.const 0
                  i32.store offset=24
                  local.get $l6
                  local.get $l3
                  i32.store offset=12
                  local.get $l6
                  local.get $l4
                  i32.store offset=8
                end
                local.get $l9
                i32.const 8
                i32.add
                local.set $p0
                br $B0
              end
              local.get $l3
              i32.load offset=8
              local.tee $p0
              local.get $l2
              i32.store offset=12
              local.get $l3
              local.get $l2
              i32.store offset=8
              local.get $l2
              i32.const 0
              i32.store offset=24
              local.get $l2
              local.get $l3
              i32.store offset=12
              local.get $l2
              local.get $p0
              i32.store offset=8
            end
            i32.const 1044
            i32.load
            local.tee $p0
            local.get $l4
            i32.le_u
            br_if $B3
            i32.const 1044
            local.get $p0
            local.get $l4
            i32.sub
            local.tee $l2
            i32.store
            i32.const 1056
            i32.const 1056
            i32.load
            local.tee $p0
            local.get $l4
            i32.add
            local.tee $l3
            i32.store
            local.get $l3
            local.get $l2
            i32.const 1
            i32.or
            i32.store offset=4
            local.get $p0
            local.get $l4
            i32.const 3
            i32.or
            i32.store offset=4
            local.get $p0
            i32.const 8
            i32.add
            local.set $p0
            br $B0
          end
          i32.const 1028
          i32.const 48
          i32.store
          i32.const 0
          local.set $p0
          br $B0
        end
        block $B103
          local.get $l7
          i32.eqz
          br_if $B103
          block $B104
            local.get $l5
            i32.load offset=28
            local.tee $l3
            i32.const 2
            i32.shl
            i32.const 1336
            i32.add
            local.tee $p0
            i32.load
            local.get $l5
            i32.eq
            if $I105
              local.get $p0
              local.get $l1
              i32.store
              local.get $l1
              br_if $B104
              i32.const 1036
              local.get $l8
              i32.const -2
              local.get $l3
              i32.rotl
              i32.and
              local.tee $l8
              i32.store
              br $B103
            end
            local.get $l7
            i32.const 16
            i32.const 20
            local.get $l7
            i32.load offset=16
            local.get $l5
            i32.eq
            select
            i32.add
            local.get $l1
            i32.store
            local.get $l1
            i32.eqz
            br_if $B103
          end
          local.get $l1
          local.get $l7
          i32.store offset=24
          local.get $l5
          i32.load offset=16
          local.tee $p0
          if $I106
            local.get $l1
            local.get $p0
            i32.store offset=16
            local.get $p0
            local.get $l1
            i32.store offset=24
          end
          local.get $l5
          i32.load offset=20
          local.tee $p0
          i32.eqz
          br_if $B103
          local.get $l1
          local.get $p0
          i32.store offset=20
          local.get $p0
          local.get $l1
          i32.store offset=24
        end
        block $B107
          local.get $l2
          i32.const 15
          i32.le_u
          if $I108
            local.get $l5
            local.get $l2
            local.get $l4
            i32.add
            local.tee $p0
            i32.const 3
            i32.or
            i32.store offset=4
            local.get $p0
            local.get $l5
            i32.add
            local.tee $p0
            local.get $p0
            i32.load offset=4
            i32.const 1
            i32.or
            i32.store offset=4
            br $B107
          end
          local.get $l5
          local.get $l4
          i32.const 3
          i32.or
          i32.store offset=4
          local.get $l4
          local.get $l5
          i32.add
          local.tee $l1
          local.get $l2
          i32.const 1
          i32.or
          i32.store offset=4
          local.get $l1
          local.get $l2
          i32.add
          local.get $l2
          i32.store
          local.get $l2
          i32.const 255
          i32.le_u
          if $I109
            local.get $l2
            i32.const -8
            i32.and
            i32.const 1072
            i32.add
            local.set $p0
            block $B110 (result i32)
              i32.const 1032
              i32.load
              local.tee $l3
              i32.const 1
              local.get $l2
              i32.const 3
              i32.shr_u
              i32.shl
              local.tee $l2
              i32.and
              i32.eqz
              if $I111
                i32.const 1032
                local.get $l2
                local.get $l3
                i32.or
                i32.store
                local.get $p0
                br $B110
              end
              local.get $p0
              i32.load offset=8
            end
            local.set $l2
            local.get $p0
            local.get $l1
            i32.store offset=8
            local.get $l2
            local.get $l1
            i32.store offset=12
            local.get $l1
            local.get $p0
            i32.store offset=12
            local.get $l1
            local.get $l2
            i32.store offset=8
            br $B107
          end
          i32.const 31
          local.set $p0
          local.get $l2
          i32.const 16777215
          i32.le_u
          if $I112
            local.get $l2
            i32.const 38
            local.get $l2
            i32.const 8
            i32.shr_u
            i32.clz
            local.tee $p0
            i32.sub
            i32.shr_u
            i32.const 1
            i32.and
            local.get $p0
            i32.const 1
            i32.shl
            i32.sub
            i32.const 62
            i32.add
            local.set $p0
          end
          local.get $l1
          local.get $p0
          i32.store offset=28
          local.get $l1
          i64.const 0
          i64.store offset=16 align=4
          local.get $p0
          i32.const 2
          i32.shl
          i32.const 1336
          i32.add
          local.set $l3
          block $B113
            block $B114
              local.get $l8
              i32.const 1
              local.get $p0
              i32.shl
              local.tee $l4
              i32.and
              i32.eqz
              if $I115
                i32.const 1036
                local.get $l4
                local.get $l8
                i32.or
                i32.store
                local.get $l3
                local.get $l1
                i32.store
                local.get $l1
                local.get $l3
                i32.store offset=24
                br $B114
              end
              local.get $l2
              i32.const 25
              local.get $p0
              i32.const 1
              i32.shr_u
              i32.sub
              i32.const 0
              local.get $p0
              i32.const 31
              i32.ne
              select
              i32.shl
              local.set $p0
              local.get $l3
              i32.load
              local.set $l4
              loop $L116
                local.get $l4
                local.tee $l3
                i32.load offset=4
                i32.const -8
                i32.and
                local.get $l2
                i32.eq
                br_if $B113
                local.get $p0
                i32.const 29
                i32.shr_u
                local.set $l4
                local.get $p0
                i32.const 1
                i32.shl
                local.set $p0
                local.get $l3
                local.get $l4
                i32.const 4
                i32.and
                i32.add
                i32.const 16
                i32.add
                local.tee $l6
                i32.load
                local.tee $l4
                br_if $L116
              end
              local.get $l6
              local.get $l1
              i32.store
              local.get $l1
              local.get $l3
              i32.store offset=24
            end
            local.get $l1
            local.get $l1
            i32.store offset=12
            local.get $l1
            local.get $l1
            i32.store offset=8
            br $B107
          end
          local.get $l3
          i32.load offset=8
          local.tee $p0
          local.get $l1
          i32.store offset=12
          local.get $l3
          local.get $l1
          i32.store offset=8
          local.get $l1
          i32.const 0
          i32.store offset=24
          local.get $l1
          local.get $l3
          i32.store offset=12
          local.get $l1
          local.get $p0
          i32.store offset=8
        end
        local.get $l5
        i32.const 8
        i32.add
        local.set $p0
        br $B0
      end
      block $B117
        local.get $l9
        i32.eqz
        br_if $B117
        block $B118
          local.get $l1
          i32.load offset=28
          local.tee $l3
          i32.const 2
          i32.shl
          i32.const 1336
          i32.add
          local.tee $p0
          i32.load
          local.get $l1
          i32.eq
          if $I119
            local.get $p0
            local.get $l5
            i32.store
            local.get $l5
            br_if $B118
            i32.const 1036
            local.get $l11
            i32.const -2
            local.get $l3
            i32.rotl
            i32.and
            i32.store
            br $B117
          end
          local.get $l9
          i32.const 16
          i32.const 20
          local.get $l9
          i32.load offset=16
          local.get $l1
          i32.eq
          select
          i32.add
          local.get $l5
          i32.store
          local.get $l5
          i32.eqz
          br_if $B117
        end
        local.get $l5
        local.get $l9
        i32.store offset=24
        local.get $l1
        i32.load offset=16
        local.tee $p0
        if $I120
          local.get $l5
          local.get $p0
          i32.store offset=16
          local.get $p0
          local.get $l5
          i32.store offset=24
        end
        local.get $l1
        i32.load offset=20
        local.tee $p0
        i32.eqz
        br_if $B117
        local.get $l5
        local.get $p0
        i32.store offset=20
        local.get $p0
        local.get $l5
        i32.store offset=24
      end
      block $B121
        local.get $l2
        i32.const 15
        i32.le_u
        if $I122
          local.get $l1
          local.get $l2
          local.get $l4
          i32.add
          local.tee $p0
          i32.const 3
          i32.or
          i32.store offset=4
          local.get $p0
          local.get $l1
          i32.add
          local.tee $p0
          local.get $p0
          i32.load offset=4
          i32.const 1
          i32.or
          i32.store offset=4
          br $B121
        end
        local.get $l1
        local.get $l4
        i32.const 3
        i32.or
        i32.store offset=4
        local.get $l1
        local.get $l4
        i32.add
        local.tee $l3
        local.get $l2
        i32.const 1
        i32.or
        i32.store offset=4
        local.get $l2
        local.get $l3
        i32.add
        local.get $l2
        i32.store
        local.get $l8
        if $I123
          local.get $l8
          i32.const -8
          i32.and
          i32.const 1072
          i32.add
          local.set $l4
          i32.const 1052
          i32.load
          local.set $p0
          block $B124 (result i32)
            i32.const 1
            local.get $l8
            i32.const 3
            i32.shr_u
            i32.shl
            local.tee $l5
            local.get $l6
            i32.and
            i32.eqz
            if $I125
              i32.const 1032
              local.get $l5
              local.get $l6
              i32.or
              i32.store
              local.get $l4
              br $B124
            end
            local.get $l4
            i32.load offset=8
          end
          local.set $l5
          local.get $l4
          local.get $p0
          i32.store offset=8
          local.get $l5
          local.get $p0
          i32.store offset=12
          local.get $p0
          local.get $l4
          i32.store offset=12
          local.get $p0
          local.get $l5
          i32.store offset=8
        end
        i32.const 1052
        local.get $l3
        i32.store
        i32.const 1040
        local.get $l2
        i32.store
      end
      local.get $l1
      i32.const 8
      i32.add
      local.set $p0
    end
    local.get $l10
    i32.const 16
    i32.add
    global.set $g0
    local.get $p0)
  (func $free (type $t3) (param $p0 i32)
    (local $l1 i32) (local $l2 i32) (local $l3 i32) (local $l4 i32) (local $l5 i32) (local $l6 i32) (local $l7 i32)
    block $B0
      local.get $p0
      i32.eqz
      br_if $B0
      local.get $p0
      i32.const 8
      i32.sub
      local.tee $l2
      local.get $p0
      i32.const 4
      i32.sub
      i32.load
      local.tee $l1
      i32.const -8
      i32.and
      local.tee $p0
      i32.add
      local.set $l5
      block $B1
        local.get $l1
        i32.const 1
        i32.and
        br_if $B1
        local.get $l1
        i32.const 3
        i32.and
        i32.eqz
        br_if $B0
        local.get $l2
        local.get $l2
        i32.load
        local.tee $l1
        i32.sub
        local.tee $l2
        i32.const 1048
        i32.load
        i32.lt_u
        br_if $B0
        local.get $p0
        local.get $l1
        i32.add
        local.set $p0
        block $B2
          block $B3
            i32.const 1052
            i32.load
            local.get $l2
            i32.ne
            if $I4
              local.get $l1
              i32.const 255
              i32.le_u
              if $I5
                local.get $l1
                i32.const 3
                i32.shr_u
                local.set $l7
                local.get $l2
                i32.load offset=12
                local.tee $l1
                local.get $l2
                i32.load offset=8
                local.tee $l4
                i32.eq
                if $I6
                  i32.const 1032
                  i32.const 1032
                  i32.load
                  i32.const -2
                  local.get $l7
                  i32.rotl
                  i32.and
                  i32.store
                  br $B1
                end
                local.get $l4
                local.get $l1
                i32.store offset=12
                local.get $l1
                local.get $l4
                i32.store offset=8
                br $B1
              end
              local.get $l2
              i32.load offset=24
              local.set $l6
              local.get $l2
              local.get $l2
              i32.load offset=12
              local.tee $l3
              i32.ne
              if $I7
                local.get $l2
                i32.load offset=8
                local.tee $l1
                local.get $l3
                i32.store offset=12
                local.get $l3
                local.get $l1
                i32.store offset=8
                br $B2
              end
              local.get $l2
              i32.const 20
              i32.add
              local.tee $l4
              i32.load
              local.tee $l1
              i32.eqz
              if $I8
                local.get $l2
                i32.load offset=16
                local.tee $l1
                i32.eqz
                br_if $B3
                local.get $l2
                i32.const 16
                i32.add
                local.set $l4
              end
              loop $L9
                local.get $l4
                local.set $l7
                local.get $l1
                local.tee $l3
                i32.const 20
                i32.add
                local.tee $l4
                i32.load
                local.tee $l1
                br_if $L9
                local.get $l3
                i32.const 16
                i32.add
                local.set $l4
                local.get $l3
                i32.load offset=16
                local.tee $l1
                br_if $L9
              end
              local.get $l7
              i32.const 0
              i32.store
              br $B2
            end
            local.get $l5
            i32.load offset=4
            local.tee $l1
            i32.const 3
            i32.and
            i32.const 3
            i32.ne
            br_if $B1
            i32.const 1040
            local.get $p0
            i32.store
            local.get $l5
            local.get $l1
            i32.const -2
            i32.and
            i32.store offset=4
            local.get $l2
            local.get $p0
            i32.const 1
            i32.or
            i32.store offset=4
            local.get $l5
            local.get $p0
            i32.store
            return
          end
          i32.const 0
          local.set $l3
        end
        local.get $l6
        i32.eqz
        br_if $B1
        block $B10
          local.get $l2
          i32.load offset=28
          local.tee $l4
          i32.const 2
          i32.shl
          i32.const 1336
          i32.add
          local.tee $l1
          i32.load
          local.get $l2
          i32.eq
          if $I11
            local.get $l1
            local.get $l3
            i32.store
            local.get $l3
            br_if $B10
            i32.const 1036
            i32.const 1036
            i32.load
            i32.const -2
            local.get $l4
            i32.rotl
            i32.and
            i32.store
            br $B1
          end
          local.get $l6
          i32.const 16
          i32.const 20
          local.get $l6
          i32.load offset=16
          local.get $l2
          i32.eq
          select
          i32.add
          local.get $l3
          i32.store
          local.get $l3
          i32.eqz
          br_if $B1
        end
        local.get $l3
        local.get $l6
        i32.store offset=24
        local.get $l2
        i32.load offset=16
        local.tee $l1
        if $I12
          local.get $l3
          local.get $l1
          i32.store offset=16
          local.get $l1
          local.get $l3
          i32.store offset=24
        end
        local.get $l2
        i32.load offset=20
        local.tee $l1
        i32.eqz
        br_if $B1
        local.get $l3
        local.get $l1
        i32.store offset=20
        local.get $l1
        local.get $l3
        i32.store offset=24
      end
      local.get $l2
      local.get $l5
      i32.ge_u
      br_if $B0
      local.get $l5
      i32.load offset=4
      local.tee $l1
      i32.const 1
      i32.and
      i32.eqz
      br_if $B0
      block $B13
        block $B14
          block $B15
            block $B16
              local.get $l1
              i32.const 2
              i32.and
              i32.eqz
              if $I17
                i32.const 1056
                i32.load
                local.get $l5
                i32.eq
                if $I18
                  i32.const 1056
                  local.get $l2
                  i32.store
                  i32.const 1044
                  i32.const 1044
                  i32.load
                  local.get $p0
                  i32.add
                  local.tee $p0
                  i32.store
                  local.get $l2
                  local.get $p0
                  i32.const 1
                  i32.or
                  i32.store offset=4
                  local.get $l2
                  i32.const 1052
                  i32.load
                  i32.ne
                  br_if $B0
                  i32.const 1040
                  i32.const 0
                  i32.store
                  i32.const 1052
                  i32.const 0
                  i32.store
                  return
                end
                i32.const 1052
                i32.load
                local.get $l5
                i32.eq
                if $I19
                  i32.const 1052
                  local.get $l2
                  i32.store
                  i32.const 1040
                  i32.const 1040
                  i32.load
                  local.get $p0
                  i32.add
                  local.tee $p0
                  i32.store
                  local.get $l2
                  local.get $p0
                  i32.const 1
                  i32.or
                  i32.store offset=4
                  local.get $p0
                  local.get $l2
                  i32.add
                  local.get $p0
                  i32.store
                  return
                end
                local.get $l1
                i32.const -8
                i32.and
                local.get $p0
                i32.add
                local.set $p0
                local.get $l1
                i32.const 255
                i32.le_u
                if $I20
                  local.get $l1
                  i32.const 3
                  i32.shr_u
                  local.set $l7
                  local.get $l5
                  i32.load offset=12
                  local.tee $l1
                  local.get $l5
                  i32.load offset=8
                  local.tee $l4
                  i32.eq
                  if $I21
                    i32.const 1032
                    i32.const 1032
                    i32.load
                    i32.const -2
                    local.get $l7
                    i32.rotl
                    i32.and
                    i32.store
                    br $B14
                  end
                  local.get $l4
                  local.get $l1
                  i32.store offset=12
                  local.get $l1
                  local.get $l4
                  i32.store offset=8
                  br $B14
                end
                local.get $l5
                i32.load offset=24
                local.set $l6
                local.get $l5
                local.get $l5
                i32.load offset=12
                local.tee $l3
                i32.ne
                if $I22
                  i32.const 1048
                  i32.load
                  drop
                  local.get $l5
                  i32.load offset=8
                  local.tee $l1
                  local.get $l3
                  i32.store offset=12
                  local.get $l3
                  local.get $l1
                  i32.store offset=8
                  br $B15
                end
                local.get $l5
                i32.const 20
                i32.add
                local.tee $l4
                i32.load
                local.tee $l1
                i32.eqz
                if $I23
                  local.get $l5
                  i32.load offset=16
                  local.tee $l1
                  i32.eqz
                  br_if $B16
                  local.get $l5
                  i32.const 16
                  i32.add
                  local.set $l4
                end
                loop $L24
                  local.get $l4
                  local.set $l7
                  local.get $l1
                  local.tee $l3
                  i32.const 20
                  i32.add
                  local.tee $l4
                  i32.load
                  local.tee $l1
                  br_if $L24
                  local.get $l3
                  i32.const 16
                  i32.add
                  local.set $l4
                  local.get $l3
                  i32.load offset=16
                  local.tee $l1
                  br_if $L24
                end
                local.get $l7
                i32.const 0
                i32.store
                br $B15
              end
              local.get $l5
              local.get $l1
              i32.const -2
              i32.and
              i32.store offset=4
              local.get $l2
              local.get $p0
              i32.const 1
              i32.or
              i32.store offset=4
              local.get $p0
              local.get $l2
              i32.add
              local.get $p0
              i32.store
              br $B13
            end
            i32.const 0
            local.set $l3
          end
          local.get $l6
          i32.eqz
          br_if $B14
          block $B25
            local.get $l5
            i32.load offset=28
            local.tee $l4
            i32.const 2
            i32.shl
            i32.const 1336
            i32.add
            local.tee $l1
            i32.load
            local.get $l5
            i32.eq
            if $I26
              local.get $l1
              local.get $l3
              i32.store
              local.get $l3
              br_if $B25
              i32.const 1036
              i32.const 1036
              i32.load
              i32.const -2
              local.get $l4
              i32.rotl
              i32.and
              i32.store
              br $B14
            end
            local.get $l6
            i32.const 16
            i32.const 20
            local.get $l6
            i32.load offset=16
            local.get $l5
            i32.eq
            select
            i32.add
            local.get $l3
            i32.store
            local.get $l3
            i32.eqz
            br_if $B14
          end
          local.get $l3
          local.get $l6
          i32.store offset=24
          local.get $l5
          i32.load offset=16
          local.tee $l1
          if $I27
            local.get $l3
            local.get $l1
            i32.store offset=16
            local.get $l1
            local.get $l3
            i32.store offset=24
          end
          local.get $l5
          i32.load offset=20
          local.tee $l1
          i32.eqz
          br_if $B14
          local.get $l3
          local.get $l1
          i32.store offset=20
          local.get $l1
          local.get $l3
          i32.store offset=24
        end
        local.get $l2
        local.get $p0
        i32.const 1
        i32.or
        i32.store offset=4
        local.get $p0
        local.get $l2
        i32.add
        local.get $p0
        i32.store
        local.get $l2
        i32.const 1052
        i32.load
        i32.ne
        br_if $B13
        i32.const 1040
        local.get $p0
        i32.store
        return
      end
      local.get $p0
      i32.const 255
      i32.le_u
      if $I28
        local.get $p0
        i32.const -8
        i32.and
        i32.const 1072
        i32.add
        local.set $l1
        block $B29 (result i32)
          i32.const 1032
          i32.load
          local.tee $l4
          i32.const 1
          local.get $p0
          i32.const 3
          i32.shr_u
          i32.shl
          local.tee $p0
          i32.and
          i32.eqz
          if $I30
            i32.const 1032
            local.get $p0
            local.get $l4
            i32.or
            i32.store
            local.get $l1
            br $B29
          end
          local.get $l1
          i32.load offset=8
        end
        local.set $p0
        local.get $l1
        local.get $l2
        i32.store offset=8
        local.get $p0
        local.get $l2
        i32.store offset=12
        local.get $l2
        local.get $l1
        i32.store offset=12
        local.get $l2
        local.get $p0
        i32.store offset=8
        return
      end
      i32.const 31
      local.set $l1
      local.get $p0
      i32.const 16777215
      i32.le_u
      if $I31
        local.get $p0
        i32.const 38
        local.get $p0
        i32.const 8
        i32.shr_u
        i32.clz
        local.tee $l1
        i32.sub
        i32.shr_u
        i32.const 1
        i32.and
        local.get $l1
        i32.const 1
        i32.shl
        i32.sub
        i32.const 62
        i32.add
        local.set $l1
      end
      local.get $l2
      local.get $l1
      i32.store offset=28
      local.get $l2
      i64.const 0
      i64.store offset=16 align=4
      local.get $l1
      i32.const 2
      i32.shl
      i32.const 1336
      i32.add
      local.set $l4
      block $B32
        block $B33
          block $B34
            i32.const 1036
            i32.load
            local.tee $l3
            i32.const 1
            local.get $l1
            i32.shl
            local.tee $l5
            i32.and
            i32.eqz
            if $I35
              i32.const 1036
              local.get $l3
              local.get $l5
              i32.or
              i32.store
              local.get $l4
              local.get $l2
              i32.store
              local.get $l2
              local.get $l4
              i32.store offset=24
              br $B34
            end
            local.get $p0
            i32.const 25
            local.get $l1
            i32.const 1
            i32.shr_u
            i32.sub
            i32.const 0
            local.get $l1
            i32.const 31
            i32.ne
            select
            i32.shl
            local.set $l1
            local.get $l4
            i32.load
            local.set $l3
            loop $L36
              local.get $l3
              local.tee $l4
              i32.load offset=4
              i32.const -8
              i32.and
              local.get $p0
              i32.eq
              br_if $B33
              local.get $l1
              i32.const 29
              i32.shr_u
              local.set $l3
              local.get $l1
              i32.const 1
              i32.shl
              local.set $l1
              local.get $l4
              local.get $l3
              i32.const 4
              i32.and
              i32.add
              i32.const 16
              i32.add
              local.tee $l5
              i32.load
              local.tee $l3
              br_if $L36
            end
            local.get $l5
            local.get $l2
            i32.store
            local.get $l2
            local.get $l4
            i32.store offset=24
          end
          local.get $l2
          local.get $l2
          i32.store offset=12
          local.get $l2
          local.get $l2
          i32.store offset=8
          br $B32
        end
        local.get $l4
        i32.load offset=8
        local.tee $p0
        local.get $l2
        i32.store offset=12
        local.get $l4
        local.get $l2
        i32.store offset=8
        local.get $l2
        i32.const 0
        i32.store offset=24
        local.get $l2
        local.get $l4
        i32.store offset=12
        local.get $l2
        local.get $p0
        i32.store offset=8
      end
      i32.const 1064
      i32.const 1064
      i32.load
      i32.const 1
      i32.sub
      local.tee $l2
      i32.const -1
      local.get $l2
      select
      i32.store
    end)
  (table $__indirect_function_table 1 1 funcref)
  (memory $memory 256 65536)
  (global $g0 (mut i32) (i32.const 67072))
  (export "memory" (memory $memory))
  (export "__wasm_call_ctors" (func $__wasm_call_ctors))
  (export "dot_product_serial_c_plain" (func $dot_product_serial_c_plain))
  (export "dot_product_c" (func $dot_product_c))
  (export "dot_product_serial_c" (func $dot_product_serial_c))
  (export "__errno_location" (func $__errno_location))
  (export "malloc" (func $malloc))
  (export "free" (func $free))
  (export "stackSave" (func $stackSave))
  (export "stackRestore" (func $stackRestore))
  (export "stackAlloc" (func $stackAlloc))
  (export "__indirect_function_table" (table $__indirect_function_table))
  (data $d0 (i32.const 1025) "\06\01"))
