(module $wasm_c.wasm
  (type $t0 (func (param i32) (result i32)))
  (type $t1 (func (param i32)))
  (type $t2 (func))
  (type $t3 (func (param i32 i32 i32) (result f32)))
  (type $t4 (func (result i32)))
  (import "env" "emscripten_resize_heap" (func $emscripten_resize_heap (type $t0)))
  (func $__wasm_call_ctors (type $t2))
  (func $dot_product_c (type $t3) (param $p0 i32) (param $p1 i32) (param $p2 i32) (result f32)
    (local $l3 v128) (local $l4 i32) (local $l5 i32) (local $l6 i32) (local $l7 i32)
    block $B0
      local.get $p2
      i32.eqz
      if $I1
        br $B0
      end
      local.get $p2
      i32.const 1
      i32.sub
      local.set $l5
      block $B2
        local.get $p2
        i32.const 5
        i32.lt_u
        if $I3
          i32.const 0
          local.set $p2
          br $B2
        end
        local.get $l5
        i32.const 2
        i32.shr_u
        i32.const 1
        i32.add
        i32.const 2147483646
        i32.and
        local.set $l7
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
          i32.const 8
          i32.add
          local.set $p2
          local.get $l6
          i32.const 2
          i32.add
          local.tee $l6
          local.get $l7
          i32.ne
          br_if $L4
        end
      end
      local.get $l5
      i32.const 4
      i32.and
      br_if $B0
      local.get $l3
      local.get $p0
      local.get $p2
      i32.const 2
      i32.shl
      local.tee $p2
      i32.add
      v128.load align=1
      local.get $p1
      local.get $p2
      i32.add
      v128.load align=1
      f32x4.mul
      f32x4.add
      local.set $l3
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
  (func $_emscripten_stack_restore (type $t1) (param $p0 i32)
    local.get $p0
    global.set $__stack_pointer)
  (func $_emscripten_stack_alloc (type $t0) (param $p0 i32) (result i32)
    global.get $__stack_pointer
    local.get $p0
    i32.sub
    i32.const -16
    i32.and
    local.tee $p0
    global.set $__stack_pointer
    local.get $p0)
  (func $emscripten_stack_get_current (type $t4) (result i32)
    global.get $__stack_pointer)
  (func $sbrk (type $t0) (param $p0 i32) (result i32)
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
      i32.eqz
      if $I1
        local.get $p0
        memory.size
        i32.const 16
        i32.shl
        i32.le_u
        br_if $B0
        local.get $p0
        call $emscripten_resize_heap
        br_if $B0
      end
      i32.const 1028
      i32.const 48
      i32.store
      i32.const -1
      return
    end
    i32.const 1024
    local.get $p0
    i32.store
    local.get $l1)
  (func $emscripten_builtin_malloc (type $t0) (param $p0 i32) (result i32)
    (local $l1 i32) (local $l2 i32) (local $l3 i32) (local $l4 i32) (local $l5 i32) (local $l6 i32) (local $l7 i32) (local $l8 i32) (local $l9 i32) (local $l10 i32) (local $l11 i32)
    global.get $__stack_pointer
    i32.const 16
    i32.sub
    local.tee $l10
    global.set $__stack_pointer
    block $B0
      block $B1
        block $B2
          block $B3
            block $B4
              block $B5
                block $B6
                  block $B7
                    block $B8
                      block $B9
                        local.get $p0
                        i32.const 244
                        i32.le_u
                        if $I10
                          i32.const 1032
                          i32.load
                          local.tee $l6
                          i32.const 16
                          local.get $p0
                          i32.const 11
                          i32.add
                          i32.const 504
                          i32.and
                          local.get $p0
                          i32.const 11
                          i32.lt_u
                          select
                          local.tee $l4
                          i32.const 3
                          i32.shr_u
                          local.tee $l1
                          i32.shr_u
                          local.tee $p0
                          i32.const 3
                          i32.and
                          if $I11
                            block $B12
                              local.get $p0
                              i32.const -1
                              i32.xor
                              i32.const 1
                              i32.and
                              local.get $l1
                              i32.add
                              local.tee $l4
                              i32.const 3
                              i32.shl
                              local.tee $l1
                              i32.const 1072
                              i32.add
                              local.tee $p0
                              local.get $l1
                              i32.const 1080
                              i32.add
                              i32.load
                              local.tee $l1
                              i32.load offset=8
                              local.tee $l3
                              i32.eq
                              if $I13
                                i32.const 1032
                                local.get $l6
                                i32.const -2
                                local.get $l4
                                i32.rotl
                                i32.and
                                i32.store
                                br $B12
                              end
                              local.get $l3
                              local.get $p0
                              i32.store offset=12
                              local.get $p0
                              local.get $l3
                              i32.store offset=8
                            end
                            local.get $l1
                            i32.const 8
                            i32.add
                            local.set $p0
                            local.get $l1
                            local.get $l4
                            i32.const 3
                            i32.shl
                            local.tee $l4
                            i32.const 3
                            i32.or
                            i32.store offset=4
                            local.get $l1
                            local.get $l4
                            i32.add
                            local.tee $l1
                            local.get $l1
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
                          br_if $B9
                          local.get $p0
                          if $I14
                            block $B15
                              local.get $p0
                              local.get $l1
                              i32.shl
                              i32.const 2
                              local.get $l1
                              i32.shl
                              local.tee $p0
                              i32.const 0
                              local.get $p0
                              i32.sub
                              i32.or
                              i32.and
                              i32.ctz
                              local.tee $l1
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
                              local.tee $l2
                              i32.eq
                              if $I16
                                i32.const 1032
                                local.get $l6
                                i32.const -2
                                local.get $l1
                                i32.rotl
                                i32.and
                                local.tee $l6
                                i32.store
                                br $B15
                              end
                              local.get $l2
                              local.get $l3
                              i32.store offset=12
                              local.get $l3
                              local.get $l2
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
                            local.tee $l2
                            local.get $l1
                            i32.const 3
                            i32.shl
                            local.tee $l1
                            local.get $l4
                            i32.sub
                            local.tee $l4
                            i32.const 1
                            i32.or
                            i32.store offset=4
                            local.get $p0
                            local.get $l1
                            i32.add
                            local.get $l4
                            i32.store
                            local.get $l8
                            if $I17
                              local.get $l8
                              i32.const -8
                              i32.and
                              i32.const 1072
                              i32.add
                              local.set $l3
                              i32.const 1052
                              i32.load
                              local.set $l1
                              block $B18 (result i32)
                                local.get $l6
                                i32.const 1
                                local.get $l8
                                i32.const 3
                                i32.shr_u
                                i32.shl
                                local.tee $l5
                                i32.and
                                i32.eqz
                                if $I19
                                  i32.const 1032
                                  local.get $l5
                                  local.get $l6
                                  i32.or
                                  i32.store
                                  local.get $l3
                                  br $B18
                                end
                                local.get $l3
                                i32.load offset=8
                              end
                              local.set $l5
                              local.get $l3
                              local.get $l1
                              i32.store offset=8
                              local.get $l5
                              local.get $l1
                              i32.store offset=12
                              local.get $l1
                              local.get $l3
                              i32.store offset=12
                              local.get $l1
                              local.get $l5
                              i32.store offset=8
                            end
                            local.get $p0
                            i32.const 8
                            i32.add
                            local.set $p0
                            i32.const 1052
                            local.get $l2
                            i32.store
                            i32.const 1040
                            local.get $l4
                            i32.store
                            br $B0
                          end
                          i32.const 1036
                          i32.load
                          local.tee $l11
                          i32.eqz
                          br_if $B9
                          local.get $l11
                          i32.ctz
                          i32.const 2
                          i32.shl
                          i32.const 1336
                          i32.add
                          i32.load
                          local.tee $l2
                          i32.load offset=4
                          i32.const -8
                          i32.and
                          local.get $l4
                          i32.sub
                          local.set $l1
                          local.get $l2
                          local.set $l3
                          loop $L20
                            block $B21
                              local.get $l3
                              i32.load offset=16
                              local.tee $p0
                              i32.eqz
                              if $I22
                                local.get $l3
                                i32.load offset=20
                                local.tee $p0
                                i32.eqz
                                br_if $B21
                              end
                              local.get $p0
                              i32.load offset=4
                              i32.const -8
                              i32.and
                              local.get $l4
                              i32.sub
                              local.tee $l3
                              local.get $l1
                              local.get $l1
                              local.get $l3
                              i32.gt_u
                              local.tee $l3
                              select
                              local.set $l1
                              local.get $p0
                              local.get $l2
                              local.get $l3
                              select
                              local.set $l2
                              local.get $p0
                              local.set $l3
                              br $L20
                            end
                          end
                          local.get $l2
                          i32.load offset=24
                          local.set $l9
                          local.get $l2
                          local.get $l2
                          i32.load offset=12
                          local.tee $p0
                          i32.ne
                          if $I23
                            local.get $l2
                            i32.load offset=8
                            local.tee $l3
                            local.get $p0
                            i32.store offset=12
                            local.get $p0
                            local.get $l3
                            i32.store offset=8
                            br $B1
                          end
                          local.get $l2
                          i32.load offset=20
                          local.tee $l3
                          if $I24 (result i32)
                            local.get $l2
                            i32.const 20
                            i32.add
                          else
                            local.get $l2
                            i32.load offset=16
                            local.tee $l3
                            i32.eqz
                            br_if $B8
                            local.get $l2
                            i32.const 16
                            i32.add
                          end
                          local.set $l5
                          loop $L25
                            local.get $l5
                            local.set $l7
                            local.get $l3
                            local.tee $p0
                            i32.const 20
                            i32.add
                            local.set $l5
                            local.get $p0
                            i32.load offset=20
                            local.tee $l3
                            br_if $L25
                            local.get $p0
                            i32.const 16
                            i32.add
                            local.set $l5
                            local.get $p0
                            i32.load offset=16
                            local.tee $l3
                            br_if $L25
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
                        br_if $B9
                        local.get $p0
                        i32.const 11
                        i32.add
                        local.tee $l1
                        i32.const -8
                        i32.and
                        local.set $l4
                        i32.const 1036
                        i32.load
                        local.tee $l9
                        i32.eqz
                        br_if $B9
                        i32.const 31
                        local.set $l8
                        local.get $p0
                        i32.const 16777204
                        i32.le_u
                        if $I26
                          local.get $l4
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
                          local.set $l8
                        end
                        i32.const 0
                        local.get $l4
                        i32.sub
                        local.set $l1
                        block $B27
                          block $B28
                            block $B29
                              local.get $l8
                              i32.const 2
                              i32.shl
                              i32.const 1336
                              i32.add
                              i32.load
                              local.tee $l3
                              i32.eqz
                              if $I30
                                i32.const 0
                                local.set $p0
                                br $B29
                              end
                              i32.const 0
                              local.set $p0
                              local.get $l4
                              i32.const 25
                              local.get $l8
                              i32.const 1
                              i32.shr_u
                              i32.sub
                              i32.const 0
                              local.get $l8
                              i32.const 31
                              i32.ne
                              select
                              i32.shl
                              local.set $l2
                              loop $L31
                                block $B32
                                  local.get $l3
                                  i32.load offset=4
                                  i32.const -8
                                  i32.and
                                  local.get $l4
                                  i32.sub
                                  local.tee $l6
                                  local.get $l1
                                  i32.ge_u
                                  br_if $B32
                                  local.get $l3
                                  local.set $l5
                                  local.get $l6
                                  local.tee $l1
                                  br_if $B32
                                  i32.const 0
                                  local.set $l1
                                  local.get $l5
                                  local.set $p0
                                  br $B28
                                end
                                local.get $p0
                                local.get $l3
                                i32.load offset=20
                                local.tee $l6
                                local.get $l6
                                local.get $l3
                                local.get $l2
                                i32.const 29
                                i32.shr_u
                                i32.const 4
                                i32.and
                                i32.add
                                i32.load offset=16
                                local.tee $l7
                                i32.eq
                                select
                                local.get $p0
                                local.get $l6
                                select
                                local.set $p0
                                local.get $l2
                                i32.const 1
                                i32.shl
                                local.set $l2
                                local.get $l7
                                local.tee $l3
                                br_if $L31
                              end
                            end
                            local.get $p0
                            local.get $l5
                            i32.or
                            i32.eqz
                            if $I33
                              i32.const 0
                              local.set $l5
                              i32.const 2
                              local.get $l8
                              i32.shl
                              local.tee $p0
                              i32.const 0
                              local.get $p0
                              i32.sub
                              i32.or
                              local.get $l9
                              i32.and
                              local.tee $p0
                              i32.eqz
                              br_if $B9
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
                            br_if $B27
                          end
                          loop $L34
                            local.get $p0
                            i32.load offset=4
                            i32.const -8
                            i32.and
                            local.get $l4
                            i32.sub
                            local.tee $l6
                            local.get $l1
                            i32.lt_u
                            local.set $l2
                            local.get $l6
                            local.get $l1
                            local.get $l2
                            select
                            local.set $l1
                            local.get $p0
                            local.get $l5
                            local.get $l2
                            select
                            local.set $l5
                            local.get $p0
                            i32.load offset=16
                            local.tee $l3
                            if $I35 (result i32)
                              local.get $l3
                            else
                              local.get $p0
                              i32.load offset=20
                            end
                            local.tee $p0
                            br_if $L34
                          end
                        end
                        local.get $l5
                        i32.eqz
                        br_if $B9
                        local.get $l1
                        i32.const 1040
                        i32.load
                        local.get $l4
                        i32.sub
                        i32.ge_u
                        br_if $B9
                        local.get $l5
                        i32.load offset=24
                        local.set $l7
                        local.get $l5
                        local.get $l5
                        i32.load offset=12
                        local.tee $p0
                        i32.ne
                        if $I36
                          local.get $l5
                          i32.load offset=8
                          local.tee $l3
                          local.get $p0
                          i32.store offset=12
                          local.get $p0
                          local.get $l3
                          i32.store offset=8
                          br $B2
                        end
                        local.get $l5
                        i32.load offset=20
                        local.tee $l3
                        if $I37 (result i32)
                          local.get $l5
                          i32.const 20
                          i32.add
                        else
                          local.get $l5
                          i32.load offset=16
                          local.tee $l3
                          i32.eqz
                          br_if $B7
                          local.get $l5
                          i32.const 16
                          i32.add
                        end
                        local.set $l2
                        loop $L38
                          local.get $l2
                          local.set $l6
                          local.get $l3
                          local.tee $p0
                          i32.const 20
                          i32.add
                          local.set $l2
                          local.get $p0
                          i32.load offset=20
                          local.tee $l3
                          br_if $L38
                          local.get $p0
                          i32.const 16
                          i32.add
                          local.set $l2
                          local.get $p0
                          i32.load offset=16
                          local.tee $l3
                          br_if $L38
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
                      if $I39
                        i32.const 1052
                        i32.load
                        local.set $l1
                        block $B40
                          local.get $p0
                          local.get $l4
                          i32.sub
                          local.tee $l3
                          i32.const 16
                          i32.ge_u
                          if $I41
                            local.get $l1
                            local.get $l4
                            i32.add
                            local.tee $l2
                            local.get $l3
                            i32.const 1
                            i32.or
                            i32.store offset=4
                            local.get $p0
                            local.get $l1
                            i32.add
                            local.get $l3
                            i32.store
                            local.get $l1
                            local.get $l4
                            i32.const 3
                            i32.or
                            i32.store offset=4
                            br $B40
                          end
                          local.get $l1
                          local.get $p0
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
                          i32.const 0
                          local.set $l2
                          i32.const 0
                          local.set $l3
                        end
                        i32.const 1040
                        local.get $l3
                        i32.store
                        i32.const 1052
                        local.get $l2
                        i32.store
                        local.get $l1
                        i32.const 8
                        i32.add
                        local.set $p0
                        br $B0
                      end
                      local.get $l4
                      i32.const 1044
                      i32.load
                      local.tee $l2
                      i32.lt_u
                      if $I42
                        i32.const 1044
                        local.get $l2
                        local.get $l4
                        i32.sub
                        local.tee $l1
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
                        local.get $l1
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
                      block $B43 (result i32)
                        i32.const 1504
                        i32.load
                        if $I44
                          i32.const 1512
                          i32.load
                          br $B43
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
                      local.tee $l1
                      i32.add
                      local.tee $l6
                      i32.const 0
                      local.get $l1
                      i32.sub
                      local.tee $l7
                      i32.and
                      local.tee $l5
                      local.get $l4
                      i32.le_u
                      br_if $B0
                      i32.const 1472
                      i32.load
                      local.tee $l1
                      if $I45
                        i32.const 1464
                        i32.load
                        local.tee $l3
                        local.get $l5
                        i32.add
                        local.tee $l9
                        local.get $l3
                        i32.le_u
                        br_if $B0
                        local.get $l1
                        local.get $l9
                        i32.lt_u
                        br_if $B0
                      end
                      block $B46
                        i32.const 1476
                        i32.load8_u
                        i32.const 4
                        i32.and
                        i32.eqz
                        if $I47
                          block $B48
                            block $B49
                              block $B50
                                block $B51
                                  i32.const 1056
                                  i32.load
                                  local.tee $l1
                                  if $I52
                                    i32.const 1480
                                    local.set $p0
                                    loop $L53
                                      local.get $p0
                                      i32.load
                                      local.tee $l3
                                      local.get $l1
                                      i32.le_u
                                      if $I54
                                        local.get $l1
                                        local.get $l3
                                        local.get $p0
                                        i32.load offset=4
                                        i32.add
                                        i32.lt_u
                                        br_if $B51
                                      end
                                      local.get $p0
                                      i32.load offset=8
                                      local.tee $p0
                                      br_if $L53
                                    end
                                  end
                                  i32.const 0
                                  call $sbrk
                                  local.tee $l2
                                  i32.const -1
                                  i32.eq
                                  br_if $B48
                                  local.get $l5
                                  local.set $l6
                                  i32.const 1508
                                  i32.load
                                  local.tee $p0
                                  i32.const 1
                                  i32.sub
                                  local.tee $l1
                                  local.get $l2
                                  i32.and
                                  if $I55
                                    local.get $l5
                                    local.get $l2
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
                                  br_if $B48
                                  i32.const 1472
                                  i32.load
                                  local.tee $p0
                                  if $I56
                                    i32.const 1464
                                    i32.load
                                    local.tee $l1
                                    local.get $l6
                                    i32.add
                                    local.tee $l3
                                    local.get $l1
                                    i32.le_u
                                    br_if $B48
                                    local.get $p0
                                    local.get $l3
                                    i32.lt_u
                                    br_if $B48
                                  end
                                  local.get $l6
                                  call $sbrk
                                  local.tee $p0
                                  local.get $l2
                                  i32.ne
                                  br_if $B50
                                  br $B46
                                end
                                local.get $l6
                                local.get $l2
                                i32.sub
                                local.get $l7
                                i32.and
                                local.tee $l6
                                call $sbrk
                                local.tee $l2
                                local.get $p0
                                i32.load
                                local.get $p0
                                i32.load offset=4
                                i32.add
                                i32.eq
                                br_if $B49
                                local.get $l2
                                local.set $p0
                              end
                              local.get $p0
                              i32.const -1
                              i32.eq
                              br_if $B48
                              local.get $l4
                              i32.const 48
                              i32.add
                              local.get $l6
                              i32.le_u
                              if $I57
                                local.get $p0
                                local.set $l2
                                br $B46
                              end
                              i32.const 1512
                              i32.load
                              local.tee $l1
                              local.get $l8
                              local.get $l6
                              i32.sub
                              i32.add
                              i32.const 0
                              local.get $l1
                              i32.sub
                              i32.and
                              local.tee $l1
                              call $sbrk
                              i32.const -1
                              i32.eq
                              br_if $B48
                              local.get $l1
                              local.get $l6
                              i32.add
                              local.set $l6
                              local.get $p0
                              local.set $l2
                              br $B46
                            end
                            local.get $l2
                            i32.const -1
                            i32.ne
                            br_if $B46
                          end
                          i32.const 1476
                          i32.const 1476
                          i32.load
                          i32.const 4
                          i32.or
                          i32.store
                        end
                        local.get $l5
                        call $sbrk
                        local.set $l2
                        i32.const 0
                        call $sbrk
                        local.set $p0
                        local.get $l2
                        i32.const -1
                        i32.eq
                        br_if $B4
                        local.get $p0
                        i32.const -1
                        i32.eq
                        br_if $B4
                        local.get $p0
                        local.get $l2
                        i32.le_u
                        br_if $B4
                        local.get $p0
                        local.get $l2
                        i32.sub
                        local.tee $l6
                        local.get $l4
                        i32.const 40
                        i32.add
                        i32.le_u
                        br_if $B4
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
                      if $I58
                        i32.const 1468
                        local.get $p0
                        i32.store
                      end
                      block $B59
                        i32.const 1056
                        i32.load
                        local.tee $l1
                        if $I60
                          i32.const 1480
                          local.set $p0
                          loop $L61
                            local.get $l2
                            local.get $p0
                            i32.load
                            local.tee $l3
                            local.get $p0
                            i32.load offset=4
                            local.tee $l5
                            i32.add
                            i32.eq
                            br_if $B59
                            local.get $p0
                            i32.load offset=8
                            local.tee $p0
                            br_if $L61
                          end
                          br $B6
                        end
                        i32.const 1048
                        i32.load
                        local.tee $p0
                        i32.const 0
                        local.get $p0
                        local.get $l2
                        i32.le_u
                        select
                        i32.eqz
                        if $I62
                          i32.const 1048
                          local.get $l2
                          i32.store
                        end
                        i32.const 0
                        local.set $p0
                        i32.const 1484
                        local.get $l6
                        i32.store
                        i32.const 1480
                        local.get $l2
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
                        loop $L63
                          local.get $p0
                          i32.const 3
                          i32.shl
                          local.tee $l1
                          i32.const 1080
                          i32.add
                          local.get $l1
                          i32.const 1072
                          i32.add
                          local.tee $l3
                          i32.store
                          local.get $l1
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
                          br_if $L63
                        end
                        i32.const 1044
                        local.get $l6
                        i32.const 40
                        i32.sub
                        local.tee $p0
                        i32.const -8
                        local.get $l2
                        i32.sub
                        i32.const 7
                        i32.and
                        local.tee $l1
                        i32.sub
                        local.tee $l3
                        i32.store
                        i32.const 1056
                        local.get $l1
                        local.get $l2
                        i32.add
                        local.tee $l1
                        i32.store
                        local.get $l1
                        local.get $l3
                        i32.const 1
                        i32.or
                        i32.store offset=4
                        local.get $p0
                        local.get $l2
                        i32.add
                        i32.const 40
                        i32.store offset=4
                        i32.const 1060
                        i32.const 1520
                        i32.load
                        i32.store
                        br $B5
                      end
                      local.get $l1
                      local.get $l2
                      i32.ge_u
                      br_if $B6
                      local.get $l1
                      local.get $l3
                      i32.lt_u
                      br_if $B6
                      local.get $p0
                      i32.load offset=12
                      i32.const 8
                      i32.and
                      br_if $B6
                      local.get $p0
                      local.get $l5
                      local.get $l6
                      i32.add
                      i32.store offset=4
                      i32.const 1056
                      local.get $l1
                      i32.const -8
                      local.get $l1
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
                      local.tee $l2
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
                      br $B5
                    end
                    i32.const 0
                    local.set $p0
                    br $B1
                  end
                  i32.const 0
                  local.set $p0
                  br $B2
                end
                i32.const 1048
                i32.load
                local.get $l2
                i32.gt_u
                if $I64
                  i32.const 1048
                  local.get $l2
                  i32.store
                end
                local.get $l2
                local.get $l6
                i32.add
                local.set $l3
                i32.const 1480
                local.set $p0
                block $B65
                  loop $L66
                    local.get $l3
                    local.get $p0
                    i32.load
                    local.tee $l5
                    i32.ne
                    if $I67
                      local.get $p0
                      i32.load offset=8
                      local.tee $p0
                      br_if $L66
                      br $B65
                    end
                  end
                  local.get $p0
                  i32.load8_u offset=12
                  i32.const 8
                  i32.and
                  i32.eqz
                  br_if $B3
                end
                i32.const 1480
                local.set $p0
                loop $L68
                  block $B69
                    local.get $p0
                    i32.load
                    local.tee $l3
                    local.get $l1
                    i32.le_u
                    if $I70
                      local.get $l1
                      local.get $l3
                      local.get $p0
                      i32.load offset=4
                      i32.add
                      local.tee $l3
                      i32.lt_u
                      br_if $B69
                    end
                    local.get $p0
                    i32.load offset=8
                    local.set $p0
                    br $L68
                  end
                end
                i32.const 1044
                local.get $l6
                i32.const 40
                i32.sub
                local.tee $p0
                i32.const -8
                local.get $l2
                i32.sub
                i32.const 7
                i32.and
                local.tee $l5
                i32.sub
                local.tee $l7
                i32.store
                i32.const 1056
                local.get $l2
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
                local.get $l2
                i32.add
                i32.const 40
                i32.store offset=4
                i32.const 1060
                i32.const 1520
                i32.load
                i32.store
                local.get $l1
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
                local.get $l1
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
                local.get $l2
                i32.store
                i32.const 1492
                i32.const 0
                i32.store
                local.get $l5
                i32.const 24
                i32.add
                local.set $p0
                loop $L71
                  local.get $p0
                  i32.const 7
                  i32.store offset=4
                  local.get $p0
                  i32.const 8
                  i32.add
                  local.set $l2
                  local.get $p0
                  i32.const 4
                  i32.add
                  local.set $p0
                  local.get $l2
                  local.get $l3
                  i32.lt_u
                  br_if $L71
                end
                local.get $l1
                local.get $l5
                i32.eq
                br_if $B5
                local.get $l5
                local.get $l5
                i32.load offset=4
                i32.const -2
                i32.and
                i32.store offset=4
                local.get $l1
                local.get $l5
                local.get $l1
                i32.sub
                local.tee $l2
                i32.const 1
                i32.or
                i32.store offset=4
                local.get $l5
                local.get $l2
                i32.store
                block $B72 (result i32)
                  local.get $l2
                  i32.const 255
                  i32.le_u
                  if $I73
                    local.get $l2
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
                      local.get $l2
                      i32.const 3
                      i32.shr_u
                      i32.shl
                      local.tee $l2
                      i32.and
                      i32.eqz
                      if $I75
                        i32.const 1032
                        local.get $l2
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
                    local.get $l1
                    i32.store offset=8
                    local.get $l3
                    local.get $l1
                    i32.store offset=12
                    i32.const 12
                    local.set $l2
                    i32.const 8
                    br $B72
                  end
                  i32.const 31
                  local.set $p0
                  local.get $l2
                  i32.const 16777215
                  i32.le_u
                  if $I76
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
                  block $B77
                    block $B78
                      i32.const 1036
                      i32.load
                      local.tee $l5
                      i32.const 1
                      local.get $p0
                      i32.shl
                      local.tee $l6
                      i32.and
                      i32.eqz
                      if $I79
                        i32.const 1036
                        local.get $l5
                        local.get $l6
                        i32.or
                        i32.store
                        local.get $l3
                        local.get $l1
                        i32.store
                        local.get $l1
                        local.get $l3
                        i32.store offset=24
                        br $B78
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
                      local.set $l5
                      loop $L80
                        local.get $l5
                        local.tee $l3
                        i32.load offset=4
                        i32.const -8
                        i32.and
                        local.get $l2
                        i32.eq
                        br_if $B77
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
                        local.tee $l6
                        i32.load offset=16
                        local.tee $l5
                        br_if $L80
                      end
                      local.get $l6
                      local.get $l1
                      i32.store offset=16
                      local.get $l1
                      local.get $l3
                      i32.store offset=24
                    end
                    i32.const 8
                    local.set $l2
                    local.get $l1
                    local.set $l3
                    local.get $l1
                    local.set $p0
                    i32.const 12
                    br $B72
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
                  local.get $p0
                  i32.store offset=8
                  i32.const 0
                  local.set $p0
                  i32.const 24
                  local.set $l2
                  i32.const 12
                end
                local.get $l1
                i32.add
                local.get $l3
                i32.store
                local.get $l1
                local.get $l2
                i32.add
                local.get $p0
                i32.store
              end
              i32.const 1044
              i32.load
              local.tee $p0
              local.get $l4
              i32.le_u
              br_if $B4
              i32.const 1044
              local.get $p0
              local.get $l4
              i32.sub
              local.tee $l1
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
              local.get $l1
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
          local.get $p0
          local.get $l2
          i32.store
          local.get $p0
          local.get $p0
          i32.load offset=4
          local.get $l6
          i32.add
          i32.store offset=4
          local.get $l2
          i32.const -8
          local.get $l2
          i32.sub
          i32.const 7
          i32.and
          i32.add
          local.tee $l9
          local.get $l4
          i32.const 3
          i32.or
          i32.store offset=4
          local.get $l5
          i32.const -8
          local.get $l5
          i32.sub
          i32.const 7
          i32.and
          i32.add
          local.tee $l6
          local.get $l4
          local.get $l9
          i32.add
          local.tee $l1
          i32.sub
          local.set $l2
          block $B81
            i32.const 1056
            i32.load
            local.get $l6
            i32.eq
            if $I82
              i32.const 1056
              local.get $l1
              i32.store
              i32.const 1044
              i32.const 1044
              i32.load
              local.get $l2
              i32.add
              local.tee $l4
              i32.store
              local.get $l1
              local.get $l4
              i32.const 1
              i32.or
              i32.store offset=4
              br $B81
            end
            i32.const 1052
            i32.load
            local.get $l6
            i32.eq
            if $I83
              i32.const 1052
              local.get $l1
              i32.store
              i32.const 1040
              i32.const 1040
              i32.load
              local.get $l2
              i32.add
              local.tee $l4
              i32.store
              local.get $l1
              local.get $l4
              i32.const 1
              i32.or
              i32.store offset=4
              local.get $l1
              local.get $l4
              i32.add
              local.get $l4
              i32.store
              br $B81
            end
            local.get $l6
            i32.load offset=4
            local.tee $l5
            i32.const 3
            i32.and
            i32.const 1
            i32.eq
            if $I84
              local.get $l5
              i32.const -8
              i32.and
              local.set $l8
              local.get $l6
              i32.load offset=12
              local.set $l4
              block $B85
                local.get $l5
                i32.const 255
                i32.le_u
                if $I86
                  local.get $l6
                  i32.load offset=8
                  local.tee $p0
                  local.get $l4
                  i32.eq
                  if $I87
                    i32.const 1032
                    i32.const 1032
                    i32.load
                    i32.const -2
                    local.get $l5
                    i32.const 3
                    i32.shr_u
                    i32.rotl
                    i32.and
                    i32.store
                    br $B85
                  end
                  local.get $p0
                  local.get $l4
                  i32.store offset=12
                  local.get $l4
                  local.get $p0
                  i32.store offset=8
                  br $B85
                end
                local.get $l6
                i32.load offset=24
                local.set $l7
                block $B88
                  local.get $l4
                  local.get $l6
                  i32.ne
                  if $I89
                    local.get $l6
                    i32.load offset=8
                    local.tee $l5
                    local.get $l4
                    i32.store offset=12
                    local.get $l4
                    local.get $l5
                    i32.store offset=8
                    br $B88
                  end
                  block $B90
                    local.get $l6
                    i32.load offset=20
                    local.tee $l5
                    if $I91 (result i32)
                      local.get $l6
                      i32.const 20
                      i32.add
                    else
                      local.get $l6
                      i32.load offset=16
                      local.tee $l5
                      i32.eqz
                      br_if $B90
                      local.get $l6
                      i32.const 16
                      i32.add
                    end
                    local.set $p0
                    loop $L92
                      local.get $p0
                      local.set $l3
                      local.get $l5
                      local.tee $l4
                      i32.const 20
                      i32.add
                      local.set $p0
                      local.get $l4
                      i32.load offset=20
                      local.tee $l5
                      br_if $L92
                      local.get $l4
                      i32.const 16
                      i32.add
                      local.set $p0
                      local.get $l4
                      i32.load offset=16
                      local.tee $l5
                      br_if $L92
                    end
                    local.get $l3
                    i32.const 0
                    i32.store
                    br $B88
                  end
                  i32.const 0
                  local.set $l4
                end
                local.get $l7
                i32.eqz
                br_if $B85
                block $B93
                  local.get $l6
                  i32.load offset=28
                  local.tee $p0
                  i32.const 2
                  i32.shl
                  i32.const 1336
                  i32.add
                  local.tee $l5
                  i32.load
                  local.get $l6
                  i32.eq
                  if $I94
                    local.get $l5
                    local.get $l4
                    i32.store
                    local.get $l4
                    br_if $B93
                    i32.const 1036
                    i32.const 1036
                    i32.load
                    i32.const -2
                    local.get $p0
                    i32.rotl
                    i32.and
                    i32.store
                    br $B85
                  end
                  block $B95
                    local.get $l6
                    local.get $l7
                    i32.load offset=16
                    i32.eq
                    if $I96
                      local.get $l7
                      local.get $l4
                      i32.store offset=16
                      br $B95
                    end
                    local.get $l7
                    local.get $l4
                    i32.store offset=20
                  end
                  local.get $l4
                  i32.eqz
                  br_if $B85
                end
                local.get $l4
                local.get $l7
                i32.store offset=24
                local.get $l6
                i32.load offset=16
                local.tee $l5
                if $I97
                  local.get $l4
                  local.get $l5
                  i32.store offset=16
                  local.get $l5
                  local.get $l4
                  i32.store offset=24
                end
                local.get $l6
                i32.load offset=20
                local.tee $l5
                i32.eqz
                br_if $B85
                local.get $l4
                local.get $l5
                i32.store offset=20
                local.get $l5
                local.get $l4
                i32.store offset=24
              end
              local.get $l6
              local.get $l8
              i32.add
              local.tee $l6
              i32.load offset=4
              local.set $l5
              local.get $l2
              local.get $l8
              i32.add
              local.set $l2
            end
            local.get $l6
            local.get $l5
            i32.const -2
            i32.and
            i32.store offset=4
            local.get $l1
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
            if $I98
              local.get $l2
              i32.const -8
              i32.and
              i32.const 1072
              i32.add
              local.set $l4
              block $B99 (result i32)
                i32.const 1032
                i32.load
                local.tee $l5
                i32.const 1
                local.get $l2
                i32.const 3
                i32.shr_u
                i32.shl
                local.tee $l2
                i32.and
                i32.eqz
                if $I100
                  i32.const 1032
                  local.get $l2
                  local.get $l5
                  i32.or
                  i32.store
                  local.get $l4
                  br $B99
                end
                local.get $l4
                i32.load offset=8
              end
              local.set $l2
              local.get $l4
              local.get $l1
              i32.store offset=8
              local.get $l2
              local.get $l1
              i32.store offset=12
              local.get $l1
              local.get $l4
              i32.store offset=12
              local.get $l1
              local.get $l2
              i32.store offset=8
              br $B81
            end
            i32.const 31
            local.set $l4
            local.get $l2
            i32.const 16777215
            i32.le_u
            if $I101
              local.get $l2
              i32.const 38
              local.get $l2
              i32.const 8
              i32.shr_u
              i32.clz
              local.tee $l4
              i32.sub
              i32.shr_u
              i32.const 1
              i32.and
              local.get $l4
              i32.const 1
              i32.shl
              i32.sub
              i32.const 62
              i32.add
              local.set $l4
            end
            local.get $l1
            local.get $l4
            i32.store offset=28
            local.get $l1
            i64.const 0
            i64.store offset=16 align=4
            local.get $l4
            i32.const 2
            i32.shl
            i32.const 1336
            i32.add
            local.set $l5
            block $B102
              block $B103
                i32.const 1036
                i32.load
                local.tee $p0
                i32.const 1
                local.get $l4
                i32.shl
                local.tee $l6
                i32.and
                i32.eqz
                if $I104
                  i32.const 1036
                  local.get $p0
                  local.get $l6
                  i32.or
                  i32.store
                  local.get $l5
                  local.get $l1
                  i32.store
                  local.get $l1
                  local.get $l5
                  i32.store offset=24
                  br $B103
                end
                local.get $l2
                i32.const 25
                local.get $l4
                i32.const 1
                i32.shr_u
                i32.sub
                i32.const 0
                local.get $l4
                i32.const 31
                i32.ne
                select
                i32.shl
                local.set $l4
                local.get $l5
                i32.load
                local.set $p0
                loop $L105
                  local.get $p0
                  local.tee $l5
                  i32.load offset=4
                  i32.const -8
                  i32.and
                  local.get $l2
                  i32.eq
                  br_if $B102
                  local.get $l4
                  i32.const 29
                  i32.shr_u
                  local.set $p0
                  local.get $l4
                  i32.const 1
                  i32.shl
                  local.set $l4
                  local.get $l5
                  local.get $p0
                  i32.const 4
                  i32.and
                  i32.add
                  local.tee $l6
                  i32.load offset=16
                  local.tee $p0
                  br_if $L105
                end
                local.get $l6
                local.get $l1
                i32.store offset=16
                local.get $l1
                local.get $l5
                i32.store offset=24
              end
              local.get $l1
              local.get $l1
              i32.store offset=12
              local.get $l1
              local.get $l1
              i32.store offset=8
              br $B81
            end
            local.get $l5
            i32.load offset=8
            local.tee $l4
            local.get $l1
            i32.store offset=12
            local.get $l5
            local.get $l1
            i32.store offset=8
            local.get $l1
            i32.const 0
            i32.store offset=24
            local.get $l1
            local.get $l5
            i32.store offset=12
            local.get $l1
            local.get $l4
            i32.store offset=8
          end
          local.get $l9
          i32.const 8
          i32.add
          local.set $p0
          br $B0
        end
        block $B106
          local.get $l7
          i32.eqz
          br_if $B106
          block $B107
            local.get $l5
            i32.load offset=28
            local.tee $l2
            i32.const 2
            i32.shl
            i32.const 1336
            i32.add
            local.tee $l3
            i32.load
            local.get $l5
            i32.eq
            if $I108
              local.get $l3
              local.get $p0
              i32.store
              local.get $p0
              br_if $B107
              i32.const 1036
              local.get $l9
              i32.const -2
              local.get $l2
              i32.rotl
              i32.and
              local.tee $l9
              i32.store
              br $B106
            end
            block $B109
              local.get $l5
              local.get $l7
              i32.load offset=16
              i32.eq
              if $I110
                local.get $l7
                local.get $p0
                i32.store offset=16
                br $B109
              end
              local.get $l7
              local.get $p0
              i32.store offset=20
            end
            local.get $p0
            i32.eqz
            br_if $B106
          end
          local.get $p0
          local.get $l7
          i32.store offset=24
          local.get $l5
          i32.load offset=16
          local.tee $l3
          if $I111
            local.get $p0
            local.get $l3
            i32.store offset=16
            local.get $l3
            local.get $p0
            i32.store offset=24
          end
          local.get $l5
          i32.load offset=20
          local.tee $l3
          i32.eqz
          br_if $B106
          local.get $p0
          local.get $l3
          i32.store offset=20
          local.get $l3
          local.get $p0
          i32.store offset=24
        end
        block $B112
          local.get $l1
          i32.const 15
          i32.le_u
          if $I113
            local.get $l5
            local.get $l1
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
            br $B112
          end
          local.get $l5
          local.get $l4
          i32.const 3
          i32.or
          i32.store offset=4
          local.get $l4
          local.get $l5
          i32.add
          local.tee $l2
          local.get $l1
          i32.const 1
          i32.or
          i32.store offset=4
          local.get $l1
          local.get $l2
          i32.add
          local.get $l1
          i32.store
          local.get $l1
          i32.const 255
          i32.le_u
          if $I114
            local.get $l1
            i32.const -8
            i32.and
            i32.const 1072
            i32.add
            local.set $p0
            block $B115 (result i32)
              i32.const 1032
              i32.load
              local.tee $l4
              i32.const 1
              local.get $l1
              i32.const 3
              i32.shr_u
              i32.shl
              local.tee $l1
              i32.and
              i32.eqz
              if $I116
                i32.const 1032
                local.get $l1
                local.get $l4
                i32.or
                i32.store
                local.get $p0
                br $B115
              end
              local.get $p0
              i32.load offset=8
            end
            local.set $l1
            local.get $p0
            local.get $l2
            i32.store offset=8
            local.get $l1
            local.get $l2
            i32.store offset=12
            local.get $l2
            local.get $p0
            i32.store offset=12
            local.get $l2
            local.get $l1
            i32.store offset=8
            br $B112
          end
          i32.const 31
          local.set $p0
          local.get $l1
          i32.const 16777215
          i32.le_u
          if $I117
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
          local.set $l4
          block $B118
            block $B119
              local.get $l9
              i32.const 1
              local.get $p0
              i32.shl
              local.tee $l3
              i32.and
              i32.eqz
              if $I120
                i32.const 1036
                local.get $l3
                local.get $l9
                i32.or
                i32.store
                local.get $l4
                local.get $l2
                i32.store
                local.get $l2
                local.get $l4
                i32.store offset=24
                br $B119
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
              local.get $l4
              i32.load
              local.set $l3
              loop $L121
                local.get $l3
                local.tee $l4
                i32.load offset=4
                i32.const -8
                i32.and
                local.get $l1
                i32.eq
                br_if $B118
                local.get $p0
                i32.const 29
                i32.shr_u
                local.set $l3
                local.get $p0
                i32.const 1
                i32.shl
                local.set $p0
                local.get $l4
                local.get $l3
                i32.const 4
                i32.and
                i32.add
                local.tee $l6
                i32.load offset=16
                local.tee $l3
                br_if $L121
              end
              local.get $l6
              local.get $l2
              i32.store offset=16
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
            br $B112
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
        local.get $l5
        i32.const 8
        i32.add
        local.set $p0
        br $B0
      end
      block $B122
        local.get $l9
        i32.eqz
        br_if $B122
        block $B123
          local.get $l2
          i32.load offset=28
          local.tee $l5
          i32.const 2
          i32.shl
          i32.const 1336
          i32.add
          local.tee $l3
          i32.load
          local.get $l2
          i32.eq
          if $I124
            local.get $l3
            local.get $p0
            i32.store
            local.get $p0
            br_if $B123
            i32.const 1036
            local.get $l11
            i32.const -2
            local.get $l5
            i32.rotl
            i32.and
            i32.store
            br $B122
          end
          block $B125
            local.get $l2
            local.get $l9
            i32.load offset=16
            i32.eq
            if $I126
              local.get $l9
              local.get $p0
              i32.store offset=16
              br $B125
            end
            local.get $l9
            local.get $p0
            i32.store offset=20
          end
          local.get $p0
          i32.eqz
          br_if $B122
        end
        local.get $p0
        local.get $l9
        i32.store offset=24
        local.get $l2
        i32.load offset=16
        local.tee $l3
        if $I127
          local.get $p0
          local.get $l3
          i32.store offset=16
          local.get $l3
          local.get $p0
          i32.store offset=24
        end
        local.get $l2
        i32.load offset=20
        local.tee $l3
        i32.eqz
        br_if $B122
        local.get $p0
        local.get $l3
        i32.store offset=20
        local.get $l3
        local.get $p0
        i32.store offset=24
      end
      block $B128
        local.get $l1
        i32.const 15
        i32.le_u
        if $I129
          local.get $l2
          local.get $l1
          local.get $l4
          i32.add
          local.tee $p0
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
          br $B128
        end
        local.get $l2
        local.get $l4
        i32.const 3
        i32.or
        i32.store offset=4
        local.get $l2
        local.get $l4
        i32.add
        local.tee $l4
        local.get $l1
        i32.const 1
        i32.or
        i32.store offset=4
        local.get $l1
        local.get $l4
        i32.add
        local.get $l1
        i32.store
        local.get $l8
        if $I130
          local.get $l8
          i32.const -8
          i32.and
          i32.const 1072
          i32.add
          local.set $l3
          i32.const 1052
          i32.load
          local.set $p0
          block $B131 (result i32)
            i32.const 1
            local.get $l8
            i32.const 3
            i32.shr_u
            i32.shl
            local.tee $l5
            local.get $l6
            i32.and
            i32.eqz
            if $I132
              i32.const 1032
              local.get $l5
              local.get $l6
              i32.or
              i32.store
              local.get $l3
              br $B131
            end
            local.get $l3
            i32.load offset=8
          end
          local.set $l5
          local.get $l3
          local.get $p0
          i32.store offset=8
          local.get $l5
          local.get $p0
          i32.store offset=12
          local.get $p0
          local.get $l3
          i32.store offset=12
          local.get $p0
          local.get $l5
          i32.store offset=8
        end
        i32.const 1052
        local.get $l4
        i32.store
        i32.const 1040
        local.get $l1
        i32.store
      end
      local.get $l2
      i32.const 8
      i32.add
      local.set $p0
    end
    local.get $l10
    i32.const 16
    i32.add
    global.set $__stack_pointer
    local.get $p0)
  (func $emscripten_builtin_free (type $t1) (param $p0 i32)
    (local $l1 i32) (local $l2 i32) (local $l3 i32) (local $l4 i32) (local $l5 i32) (local $l6 i32) (local $l7 i32) (local $l8 i32)
    block $B0
      local.get $p0
      i32.eqz
      br_if $B0
      local.get $p0
      i32.const 8
      i32.sub
      local.tee $l3
      local.get $p0
      i32.const 4
      i32.sub
      i32.load
      local.tee $l1
      i32.const -8
      i32.and
      local.tee $p0
      i32.add
      local.set $l4
      block $B1
        local.get $l1
        i32.const 1
        i32.and
        br_if $B1
        local.get $l1
        i32.const 2
        i32.and
        i32.eqz
        br_if $B0
        local.get $l3
        local.get $l3
        i32.load
        local.tee $l2
        i32.sub
        local.tee $l3
        i32.const 1048
        i32.load
        i32.lt_u
        br_if $B0
        local.get $p0
        local.get $l2
        i32.add
        local.set $p0
        block $B2
          block $B3
            block $B4
              i32.const 1052
              i32.load
              local.get $l3
              i32.ne
              if $I5
                local.get $l3
                i32.load offset=12
                local.set $l1
                local.get $l2
                i32.const 255
                i32.le_u
                if $I6
                  local.get $l1
                  local.get $l3
                  i32.load offset=8
                  local.tee $l5
                  i32.ne
                  br_if $B4
                  i32.const 1032
                  i32.const 1032
                  i32.load
                  i32.const -2
                  local.get $l2
                  i32.const 3
                  i32.shr_u
                  i32.rotl
                  i32.and
                  i32.store
                  br $B1
                end
                local.get $l3
                i32.load offset=24
                local.set $l6
                local.get $l1
                local.get $l3
                i32.ne
                if $I7
                  local.get $l3
                  i32.load offset=8
                  local.tee $l2
                  local.get $l1
                  i32.store offset=12
                  local.get $l1
                  local.get $l2
                  i32.store offset=8
                  br $B2
                end
                local.get $l3
                i32.load offset=20
                local.tee $l2
                if $I8 (result i32)
                  local.get $l3
                  i32.const 20
                  i32.add
                else
                  local.get $l3
                  i32.load offset=16
                  local.tee $l2
                  i32.eqz
                  br_if $B3
                  local.get $l3
                  i32.const 16
                  i32.add
                end
                local.set $l5
                loop $L9
                  local.get $l5
                  local.set $l8
                  local.get $l2
                  local.tee $l1
                  i32.const 20
                  i32.add
                  local.set $l5
                  local.get $l1
                  i32.load offset=20
                  local.tee $l2
                  br_if $L9
                  local.get $l1
                  i32.const 16
                  i32.add
                  local.set $l5
                  local.get $l1
                  i32.load offset=16
                  local.tee $l2
                  br_if $L9
                end
                local.get $l8
                i32.const 0
                i32.store
                br $B2
              end
              local.get $l4
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
              local.get $l4
              local.get $l1
              i32.const -2
              i32.and
              i32.store offset=4
              local.get $l3
              local.get $p0
              i32.const 1
              i32.or
              i32.store offset=4
              local.get $l4
              local.get $p0
              i32.store
              return
            end
            local.get $l5
            local.get $l1
            i32.store offset=12
            local.get $l1
            local.get $l5
            i32.store offset=8
            br $B1
          end
          i32.const 0
          local.set $l1
        end
        local.get $l6
        i32.eqz
        br_if $B1
        block $B10
          local.get $l3
          i32.load offset=28
          local.tee $l5
          i32.const 2
          i32.shl
          i32.const 1336
          i32.add
          local.tee $l2
          i32.load
          local.get $l3
          i32.eq
          if $I11
            local.get $l2
            local.get $l1
            i32.store
            local.get $l1
            br_if $B10
            i32.const 1036
            i32.const 1036
            i32.load
            i32.const -2
            local.get $l5
            i32.rotl
            i32.and
            i32.store
            br $B1
          end
          block $B12
            local.get $l3
            local.get $l6
            i32.load offset=16
            i32.eq
            if $I13
              local.get $l6
              local.get $l1
              i32.store offset=16
              br $B12
            end
            local.get $l6
            local.get $l1
            i32.store offset=20
          end
          local.get $l1
          i32.eqz
          br_if $B1
        end
        local.get $l1
        local.get $l6
        i32.store offset=24
        local.get $l3
        i32.load offset=16
        local.tee $l2
        if $I14
          local.get $l1
          local.get $l2
          i32.store offset=16
          local.get $l2
          local.get $l1
          i32.store offset=24
        end
        local.get $l3
        i32.load offset=20
        local.tee $l2
        i32.eqz
        br_if $B1
        local.get $l1
        local.get $l2
        i32.store offset=20
        local.get $l2
        local.get $l1
        i32.store offset=24
      end
      local.get $l3
      local.get $l4
      i32.ge_u
      br_if $B0
      local.get $l4
      i32.load offset=4
      local.tee $l2
      i32.const 1
      i32.and
      i32.eqz
      br_if $B0
      block $B15
        block $B16
          block $B17
            block $B18
              local.get $l2
              i32.const 2
              i32.and
              i32.eqz
              if $I19
                i32.const 1056
                i32.load
                local.get $l4
                i32.eq
                if $I20
                  i32.const 1056
                  local.get $l3
                  i32.store
                  i32.const 1044
                  i32.const 1044
                  i32.load
                  local.get $p0
                  i32.add
                  local.tee $p0
                  i32.store
                  local.get $l3
                  local.get $p0
                  i32.const 1
                  i32.or
                  i32.store offset=4
                  local.get $l3
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
                local.tee $l6
                local.get $l4
                i32.eq
                if $I21
                  i32.const 1052
                  local.get $l3
                  i32.store
                  i32.const 1040
                  i32.const 1040
                  i32.load
                  local.get $p0
                  i32.add
                  local.tee $p0
                  i32.store
                  local.get $l3
                  local.get $p0
                  i32.const 1
                  i32.or
                  i32.store offset=4
                  local.get $p0
                  local.get $l3
                  i32.add
                  local.get $p0
                  i32.store
                  return
                end
                local.get $l2
                i32.const -8
                i32.and
                local.get $p0
                i32.add
                local.set $p0
                local.get $l4
                i32.load offset=12
                local.set $l1
                local.get $l2
                i32.const 255
                i32.le_u
                if $I22
                  local.get $l4
                  i32.load offset=8
                  local.tee $l5
                  local.get $l1
                  i32.eq
                  if $I23
                    i32.const 1032
                    i32.const 1032
                    i32.load
                    i32.const -2
                    local.get $l2
                    i32.const 3
                    i32.shr_u
                    i32.rotl
                    i32.and
                    i32.store
                    br $B16
                  end
                  local.get $l5
                  local.get $l1
                  i32.store offset=12
                  local.get $l1
                  local.get $l5
                  i32.store offset=8
                  br $B16
                end
                local.get $l4
                i32.load offset=24
                local.set $l7
                local.get $l1
                local.get $l4
                i32.ne
                if $I24
                  local.get $l4
                  i32.load offset=8
                  local.tee $l2
                  local.get $l1
                  i32.store offset=12
                  local.get $l1
                  local.get $l2
                  i32.store offset=8
                  br $B17
                end
                local.get $l4
                i32.load offset=20
                local.tee $l2
                if $I25 (result i32)
                  local.get $l4
                  i32.const 20
                  i32.add
                else
                  local.get $l4
                  i32.load offset=16
                  local.tee $l2
                  i32.eqz
                  br_if $B18
                  local.get $l4
                  i32.const 16
                  i32.add
                end
                local.set $l5
                loop $L26
                  local.get $l5
                  local.set $l8
                  local.get $l2
                  local.tee $l1
                  i32.const 20
                  i32.add
                  local.set $l5
                  local.get $l1
                  i32.load offset=20
                  local.tee $l2
                  br_if $L26
                  local.get $l1
                  i32.const 16
                  i32.add
                  local.set $l5
                  local.get $l1
                  i32.load offset=16
                  local.tee $l2
                  br_if $L26
                end
                local.get $l8
                i32.const 0
                i32.store
                br $B17
              end
              local.get $l4
              local.get $l2
              i32.const -2
              i32.and
              i32.store offset=4
              local.get $l3
              local.get $p0
              i32.const 1
              i32.or
              i32.store offset=4
              local.get $p0
              local.get $l3
              i32.add
              local.get $p0
              i32.store
              br $B15
            end
            i32.const 0
            local.set $l1
          end
          local.get $l7
          i32.eqz
          br_if $B16
          block $B27
            local.get $l4
            i32.load offset=28
            local.tee $l5
            i32.const 2
            i32.shl
            i32.const 1336
            i32.add
            local.tee $l2
            i32.load
            local.get $l4
            i32.eq
            if $I28
              local.get $l2
              local.get $l1
              i32.store
              local.get $l1
              br_if $B27
              i32.const 1036
              i32.const 1036
              i32.load
              i32.const -2
              local.get $l5
              i32.rotl
              i32.and
              i32.store
              br $B16
            end
            block $B29
              local.get $l4
              local.get $l7
              i32.load offset=16
              i32.eq
              if $I30
                local.get $l7
                local.get $l1
                i32.store offset=16
                br $B29
              end
              local.get $l7
              local.get $l1
              i32.store offset=20
            end
            local.get $l1
            i32.eqz
            br_if $B16
          end
          local.get $l1
          local.get $l7
          i32.store offset=24
          local.get $l4
          i32.load offset=16
          local.tee $l2
          if $I31
            local.get $l1
            local.get $l2
            i32.store offset=16
            local.get $l2
            local.get $l1
            i32.store offset=24
          end
          local.get $l4
          i32.load offset=20
          local.tee $l2
          i32.eqz
          br_if $B16
          local.get $l1
          local.get $l2
          i32.store offset=20
          local.get $l2
          local.get $l1
          i32.store offset=24
        end
        local.get $l3
        local.get $p0
        i32.const 1
        i32.or
        i32.store offset=4
        local.get $p0
        local.get $l3
        i32.add
        local.get $p0
        i32.store
        local.get $l3
        local.get $l6
        i32.ne
        br_if $B15
        i32.const 1040
        local.get $p0
        i32.store
        return
      end
      local.get $p0
      i32.const 255
      i32.le_u
      if $I32
        local.get $p0
        i32.const -8
        i32.and
        i32.const 1072
        i32.add
        local.set $l1
        block $B33 (result i32)
          i32.const 1032
          i32.load
          local.tee $l2
          i32.const 1
          local.get $p0
          i32.const 3
          i32.shr_u
          i32.shl
          local.tee $p0
          i32.and
          i32.eqz
          if $I34
            i32.const 1032
            local.get $p0
            local.get $l2
            i32.or
            i32.store
            local.get $l1
            br $B33
          end
          local.get $l1
          i32.load offset=8
        end
        local.set $p0
        local.get $l1
        local.get $l3
        i32.store offset=8
        local.get $p0
        local.get $l3
        i32.store offset=12
        local.get $l3
        local.get $l1
        i32.store offset=12
        local.get $l3
        local.get $p0
        i32.store offset=8
        return
      end
      i32.const 31
      local.set $l1
      local.get $p0
      i32.const 16777215
      i32.le_u
      if $I35
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
      local.get $l3
      local.get $l1
      i32.store offset=28
      local.get $l3
      i64.const 0
      i64.store offset=16 align=4
      local.get $l1
      i32.const 2
      i32.shl
      i32.const 1336
      i32.add
      local.set $l5
      block $B36 (result i32)
        block $B37
          block $B38 (result i32)
            i32.const 1036
            i32.load
            local.tee $l2
            i32.const 1
            local.get $l1
            i32.shl
            local.tee $l4
            i32.and
            i32.eqz
            if $I39
              i32.const 1036
              local.get $l2
              local.get $l4
              i32.or
              i32.store
              local.get $l5
              local.get $l3
              i32.store
              i32.const 24
              local.set $l1
              i32.const 8
              br $B38
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
            local.get $l5
            i32.load
            local.set $l5
            loop $L40
              local.get $l5
              local.tee $l2
              i32.load offset=4
              i32.const -8
              i32.and
              local.get $p0
              i32.eq
              br_if $B37
              local.get $l1
              i32.const 29
              i32.shr_u
              local.set $l5
              local.get $l1
              i32.const 1
              i32.shl
              local.set $l1
              local.get $l2
              local.get $l5
              i32.const 4
              i32.and
              i32.add
              local.tee $l4
              i32.load offset=16
              local.tee $l5
              br_if $L40
            end
            local.get $l4
            local.get $l3
            i32.store offset=16
            i32.const 24
            local.set $l1
            local.get $l2
            local.set $l5
            i32.const 8
          end
          local.set $p0
          local.get $l3
          local.set $l2
          local.get $l3
          br $B36
        end
        local.get $l2
        i32.load offset=8
        local.tee $l5
        local.get $l3
        i32.store offset=12
        local.get $l2
        local.get $l3
        i32.store offset=8
        i32.const 24
        local.set $p0
        i32.const 8
        local.set $l1
        i32.const 0
      end
      local.set $l4
      local.get $l1
      local.get $l3
      i32.add
      local.get $l5
      i32.store
      local.get $l3
      local.get $l2
      i32.store offset=12
      local.get $p0
      local.get $l3
      i32.add
      local.get $l4
      i32.store
      i32.const 1064
      i32.const 1064
      i32.load
      i32.const 1
      i32.sub
      local.tee $l3
      i32.const -1
      local.get $l3
      select
      i32.store
    end)
  (table $__indirect_function_table 1 1 funcref)
  (memory $memory 258 258)
  (global $__stack_pointer (mut i32) (i32.const 67072))
  (export "memory" (memory $memory))
  (export "__wasm_call_ctors" (func $__wasm_call_ctors))
  (export "dot_product_c" (func $dot_product_c))
  (export "malloc" (func $emscripten_builtin_malloc))
  (export "free" (func $emscripten_builtin_free))
  (export "_emscripten_stack_restore" (func $_emscripten_stack_restore))
  (export "_emscripten_stack_alloc" (func $_emscripten_stack_alloc))
  (export "emscripten_stack_get_current" (func $emscripten_stack_get_current))
  (export "__indirect_function_table" (table $__indirect_function_table))
  (data $.data (i32.const 1025) "\06\01"))
