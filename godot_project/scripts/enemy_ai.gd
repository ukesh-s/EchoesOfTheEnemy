class_name EnemyAI
extends CharacterBody2D

signal state_changed(enemy_name: String, old_state: String, new_state: String, reason: String)
signal attacked_player(damage: int)

enum State { PATROL, CHASE, SEARCH, RETURN, ATTACK }

@export_category("Enemy Identity")
@export var enemy_name: String = "Enemy 1"

@export_category("AI Speeds & Ranges")
@export var patrol_speed: float = 90.0
@export var chase_speed: float = 135.0
@export var detection_range: float = 260.0
@export var attack_range: float = 40.0
@export var search_duration: float = 2.5
@export var attack_cooldown: float = 1.0
@export var damage: int = 10

@export_category("Patrol Config")
@export var patrol_points: Array[Vector2] = []
@export var waypoint_tolerance: float = 16.0

@export_category("Debug Visualization")
@export var show_debug_visuals: bool = true

var state: State = State.PATROL
var player: Node2D = null
var home_position: Vector2
var last_known_player_position: Vector2
var search_time_left: float = 0.0
var attack_time_left: float = 0.0
var current_patrol_index: int = 0
var search_look_angle: float = 0.0

@onready var sprite: Sprite2D = $Sprite2D
@onready var debug_label: Label = $DebugLabel

func _ready() -> void:
	home_position = global_position
	# If no specific patrol points configured, create a ping-pong route around home
	if patrol_points.is_empty():
		patrol_points.append(home_position + Vector2(-120, 0))
		patrol_points.append(home_position + Vector2(120, 0))
		
	# Find player node in group 'player'
	call_deferred("_find_player")
	_update_debug_label()
	_update_appearance()

func _find_player() -> void:
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		player = players[0]

func _physics_process(delta: float) -> void:
	# Keep player reference active
	if player == null or not is_instance_valid(player):
		_find_player()

	# Cooldown decrements
	attack_time_left = max(attack_time_left - delta, 0.0)

	# Run perception check
	var player_in_detection: bool = false
	var player_in_attack: bool = false
	var dist_to_player: float = 99999.0

	if player != null and is_instance_valid(player):
		dist_to_player = global_position.distance_to(player.global_position)
		player_in_detection = (dist_to_player <= detection_range)
		player_in_attack = (dist_to_player <= attack_range)

	# FSM Transitions
	match state:
		State.PATROL:
			if player_in_detection:
				last_known_player_position = player.global_position
				change_state(State.CHASE, "Player entered detection range (%.1f px)" % dist_to_player)

		State.CHASE:
			if player_in_detection:
				last_known_player_position = player.global_position
				if player_in_attack:
					change_state(State.ATTACK, "Player entered attack range (%.1f px)" % dist_to_player)
			else:
				# Player lost -> SEARCH
				search_time_left = search_duration
				change_state(State.SEARCH, "Lost line-of-sight / detection; investigating last seen position")

		State.SEARCH:
			if player_in_detection:
				last_known_player_position = player.global_position
				change_state(State.CHASE, "Reacquired player during search (%.1f px)" % dist_to_player)
			else:
				search_time_left -= delta
				if search_time_left <= 0.0:
					change_state(State.RETURN, "Search timer expired (%.1fs); returning home" % search_duration)

		State.RETURN:
			if player_in_detection:
				last_known_player_position = player.global_position
				change_state(State.CHASE, "Player re-encountered during return journey")
			elif global_position.distance_to(home_position) <= waypoint_tolerance:
				change_state(State.PATROL, "Reached home base; resuming scheduled patrol")

		State.ATTACK:
			if not player_in_attack:
				if player_in_detection:
					change_state(State.CHASE, "Player escaped melee attack range")
				else:
					search_time_left = search_duration
					change_state(State.SEARCH, "Player dashed out of detection range")

	# FSM Actions (Executing current state behaviour)
	match state:
		State.PATROL:
			_execute_patrol(delta)

		State.CHASE:
			if player != null:
				_move_towards(player.global_position, chase_speed, delta)

		State.SEARCH:
			_execute_search(delta)

		State.RETURN:
			_move_towards(home_position, patrol_speed, delta)

		State.ATTACK:
			velocity = Vector2.ZERO
			if attack_time_left <= 0.0 and player != null:
				_perform_attack()

	move_and_slide()

	if show_debug_visuals:
		queue_redraw()

func _execute_patrol(delta: float) -> void:
	if patrol_points.is_empty():
		velocity = Vector2.ZERO
		return

	var target: Vector2 = patrol_points[current_patrol_index]
	var dist: float = global_position.distance_to(target)

	if dist <= waypoint_tolerance:
		# Cycle to next waypoint
		current_patrol_index = (current_patrol_index + 1) % patrol_points.size()
		target = patrol_points[current_patrol_index]

	_move_towards(target, patrol_speed, delta)

func _execute_search(delta: float) -> void:
	var dist: float = global_position.distance_to(last_known_player_position)
	if dist > 20.0:
		# Still moving toward last known position
		_move_towards(last_known_player_position, patrol_speed * 0.9, delta)
	else:
		# Look around on the spot
		velocity = Vector2.ZERO
		search_look_angle += 3.5 * delta
		if sprite:
			rotation = search_look_angle

func _move_towards(target: Vector2, current_speed: float, delta: float) -> void:
	var direction := global_position.direction_to(target)
	velocity = direction * current_speed
	if sprite and direction.length_squared() > 0.01:
		rotation = lerp_angle(rotation, direction.angle() + PI / 2.0, 12.0 * delta)

func _perform_attack() -> void:
	attack_time_left = attack_cooldown
	if player != null and player.has_method("take_damage"):
		player.take_damage(damage)
		emit_signal("attacked_player", damage)

func change_state(new_state: State, reason: String = "") -> void:
	if state == new_state:
		return
	var old_state_name := State.keys()[state]
	var new_state_name := State.keys()[new_state]
	
	state = new_state
	print("[%s] %s -> %s | Reason: %s" % [enemy_name, old_state_name, new_state_name, reason])
	
	_update_debug_label()
	_update_appearance()
	emit_signal("state_changed", enemy_name, old_state_name, new_state_name, reason)

func _update_debug_label() -> void:
	if debug_label:
		debug_label.text = "%s: %s" % [enemy_name, State.keys()[state]]

func _update_appearance() -> void:
	if sprite == null:
		return
	match state:
		State.PATROL:
			sprite.modulate = Color(0.3, 0.8, 1.0) # Calm blue
		State.CHASE:
			sprite.modulate = Color(1.0, 0.55, 0.1) # Amber alert
		State.ATTACK:
			sprite.modulate = Color(1.0, 0.15, 0.2) # Crimson strike
		State.SEARCH:
			sprite.modulate = Color(1.0, 0.9, 0.2) # Yellow investigate
		State.RETURN:
			sprite.modulate = Color(0.8, 0.4, 0.95) # Violet reset

func _draw() -> void:
	if not show_debug_visuals:
		return

	# Draw Detection Range (Dashed/transparent circle)
	draw_arc(Vector2.ZERO, detection_range, 0, TAU, 36, Color(1, 0.7, 0.2, 0.25), 2.0)
	
	# Draw Attack Range (Red circle)
	draw_arc(Vector2.ZERO, attack_range, 0, TAU, 24, Color(1, 0.2, 0.2, 0.5), 2.0)

	# If in SEARCH mode, draw vector line to last known player position
	if state == State.SEARCH:
		var local_last_known = to_local(last_known_player_position)
		draw_line(Vector2.ZERO, local_last_known, Color(1, 0.9, 0.2, 0.6), 2.0)
		draw_circle(local_last_known, 6.0, Color(1, 0.9, 0.2, 0.8))
