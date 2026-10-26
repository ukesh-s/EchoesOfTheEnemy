class_name GameManager
extends Node

signal survival_timer_updated(seconds: float)
signal game_over_triggered(final_survival_time: float)
signal debug_toggled(is_enabled: bool)

@export var player_node: Player
@export var hud_node: CanvasLayer
@export var enemies_container: Node2D

var survival_time: float = 0.0
var is_game_over: bool = false
var debug_visuals_active: bool = true

@onready var sfx_alert: AudioStreamPlayer = $SFXAlert
@onready var sfx_attack: AudioStreamPlayer = $SFXAttack
@onready var sfx_hurt: AudioStreamPlayer = $SFXHurt
@onready var sfx_gameover: AudioStreamPlayer = $SFXGameOver

func _ready() -> void:
	survival_time = 0.0
	is_game_over = false

	# Connect player signals if available
	if player_node:
		player_node.player_died.connect(_on_player_died)
		player_node.player_damaged.connect(_on_player_damaged)

	# Connect enemies signals
	if enemies_container:
		for enemy in enemies_container.get_children():
			if enemy is EnemyAI:
				enemy.state_changed.connect(_on_enemy_state_changed)
				enemy.attacked_player.connect(_on_enemy_attacked)

func _process(delta: float) -> void:
	if not is_game_over:
		survival_time += delta
		emit_signal("survival_timer_updated", survival_time)

	# Input handling for Restart and Debug Toggle
	if Input.is_action_just_pressed("restart"):
		restart_game()

	if Input.is_action_just_pressed("toggle_debug"):
		toggle_debug_visuals()

func _on_player_damaged(_amount: int) -> void:
	if sfx_hurt and not is_game_over:
		sfx_hurt.play()

func _on_enemy_attacked(_damage: int) -> void:
	if sfx_attack and not is_game_over:
		sfx_attack.play()

func _on_enemy_state_changed(_enemy_name: String, _old_state: String, new_state: String, _reason: String) -> void:
	if new_state == "CHASE" and sfx_alert and not is_game_over:
		sfx_alert.play()

func _on_player_died() -> void:
	if is_game_over:
		return
	is_game_over = true
	if sfx_gameover:
		sfx_gameover.play()
	emit_signal("game_over_triggered", survival_time)

func restart_game() -> void:
	get_tree().reload_current_scene()

func toggle_debug_visuals() -> void:
	debug_visuals_active = not debug_visuals_active
	if enemies_container:
		for enemy in enemies_container.get_children():
			if enemy is EnemyAI:
				enemy.show_debug_visuals = debug_visuals_active
	emit_signal("debug_toggled", debug_visuals_active)
